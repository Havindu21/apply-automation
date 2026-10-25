import { PgBoss } from "pg-boss";
import * as dotenv from "dotenv";
import { db } from "../db/index";
import { jobExecutionLogs } from "../db/schema";
import { ProfileService } from "../lib/services/profile-service";
import { discoveryOrchestrator } from "../lib/discovery/orchestrator";

dotenv.config();

const connectionString =
  process.env.PGBOSS_DATABASE_URL ||
  process.env.DATABASE_URL ||
  "postgresql://jobpilot:jobpilot_secret@localhost:5432/jobpilot";

let clientBoss: PgBoss | null = null;

export async function getQueueClient(): Promise<PgBoss> {
  if (clientBoss) {
    return clientBoss;
  }
  const conn =
    process.env.PGBOSS_DATABASE_URL ||
    process.env.DATABASE_URL ||
    "postgresql://jobpilot:jobpilot_secret@localhost:5432/jobpilot";

  clientBoss = new PgBoss({
    connectionString: conn,
    max: 2,
    schema: "pgboss",
  });
  await clientBoss.start();
  try { await clientBoss.createQueue("job-discovery"); } catch {}
  try { await clientBoss.createQueue("job-matching"); } catch {}
  try { await clientBoss.createQueue("sync-schedule"); } catch {}
  try { await clientBoss.createQueue("health-check"); } catch {}
  return clientBoss;
}

export async function enqueueDiscoveryJob(source?: string): Promise<string | null> {
  const boss = await getQueueClient();
  return await boss.send("job-discovery", { source: source || "all" }, { retryLimit: 3 });
}

export async function enqueueScheduleSync(): Promise<string | null> {
  const boss = await getQueueClient();
  return await boss.send("sync-schedule", { timestamp: Date.now() });
}

export class JobWorkerService {
  private boss: PgBoss | null = null;
  private isRunning: boolean = false;
  private scheduleInterval: NodeJS.Timeout | null = null;

  async start() {
    console.log("Starting JobPilot Background Worker...");

    try {
      this.boss = new PgBoss({
        connectionString,
        max: 5,
        // pg-boss 12 options
        schema: "pgboss",
      });

      this.boss.on("error", (error) => {
        console.error("[JobWorker] Boss error:", error.message);
      });

      await this.boss.start();
      this.isRunning = true;
      console.log("[JobWorker] Connected to PostgreSQL queue.");

      // Register worker job handlers
      await this.registerHandlers();

      // Schedule recurring jobs based on profile preferences
      await this.syncSchedule();

      // Periodic check to ensure worker schedule reflects any preference updates
      this.scheduleInterval = setInterval(() => {
        this.syncSchedule().catch((e) => console.warn("[JobWorker] Periodic sync warning:", e));
      }, 60000);

      console.log("[JobWorker] All job handlers and schedules initialized.");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.warn(
        `[JobWorker] Could not connect to database queue (${message}). Worker will retry in 10s...`
      );
      setTimeout(() => this.start(), 10000);
    }
  }

  private async registerHandlers() {
    if (!this.boss) return;

    // Ensure queues are created in pg-boss
    await this.boss.createQueue("job-discovery");
    await this.boss.createQueue("job-matching");
    await this.boss.createQueue("sync-schedule");
    await this.boss.createQueue("health-check");

    // 0. Schedule Synchronization Worker
    await this.boss.work("sync-schedule", async () => {
      console.log("[JobWorker] Received schedule sync request from web UI.");
      await this.syncSchedule();
    });

    // 1. Job Discovery Worker
    await this.boss.work("job-discovery", { batchSize: 1 }, async ([job]) => {
      const logId = `log-disc-${Date.now()}`;
      console.log(`[JobWorker] Starting job-discovery execution (${logId})...`);

      const jobData = (job.data || {}) as { source?: string };
      const startTime = new Date();
      await this.recordJobLog({
        id: logId,
        jobType: "discovery",
        status: "running",
        source: jobData.source || "all",
        startedAt: startTime,
      });

      try {
        console.log(`[JobWorker] Running real discovery pipeline (source: ${jobData.source || "all"})...`);
        const result = await discoveryOrchestrator.runDiscovery({
          source: jobData.source,
          limitPerSource: 20,
        });

        console.log(
          `[JobWorker] Discovery completed: ${result.totalFetched} fetched, ${result.totalEligible} eligible, ${result.totalFilteredOut} filtered out.`
        );

        await this.recordJobLog({
          id: logId,
          jobType: "discovery",
          status: "completed",
          source: jobData.source || "all",
          itemsProcessed: result.totalFetched,
          itemsSucceeded: result.totalEligible,
          itemsFailed: result.totalFilteredOut,
          completedAt: new Date(),
        });
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : "Discovery error";
        console.error(`[JobWorker] Discovery failed:`, err);
        await this.recordJobLog({
          id: logId,
          jobType: "discovery",
          status: "failed",
          errorMessage: errorMsg,
          completedAt: new Date(),
        });
        throw err; // Allow pg-boss retry
      }
    });

    // 2. Job Matching Worker
    await this.boss.work("job-matching", { batchSize: 1 }, async () => {
      const logId = `log-match-${Date.now()}`;
      console.log(`[JobWorker] Starting job-matching execution (${logId})...`);

      await this.recordJobLog({
        id: logId,
        jobType: "matching",
        status: "running",
        startedAt: new Date(),
      });

      try {
        await this.recordJobLog({
          id: logId,
          jobType: "matching",
          status: "completed",
          itemsProcessed: 0,
          itemsSucceeded: 0,
          completedAt: new Date(),
        });
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : "Matching error";
        await this.recordJobLog({
          id: logId,
          jobType: "matching",
          status: "failed",
          errorMessage: errorMsg,
          completedAt: new Date(),
        });
        throw err;
      }
    });

    // 3. Heartbeat / Health Check
    await this.boss.work("health-check", async () => {
      console.log(`[JobWorker] Heartbeat OK at ${new Date().toISOString()}`);
    });
  }

  async syncSchedule() {
    if (!this.boss) return;

    try {
      const profile = await ProfileService.getProfile();
      const cron = profile.preferences.automationCron || "0 8 * * *";
      const isEnabled = profile.preferences.automationEnabled;

      console.log(`[JobWorker] Syncing schedule: cron="${cron}", enabled=${isEnabled}`);

      if (isEnabled) {
        await this.boss.schedule("job-discovery", cron, { source: "all" });
      } else {
        await this.boss.unschedule("job-discovery");
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Schedule sync error";
      console.warn(`[JobWorker] Unable to sync schedule from preferences: ${message}`);
    }
  }

  async triggerManualDiscovery(source?: string) {
    return await enqueueDiscoveryJob(source);
  }

  private async recordJobLog(entry: {
    id: string;
    jobType: string;
    status: string;
    source?: string;
    itemsProcessed?: number;
    itemsSucceeded?: number;
    itemsFailed?: number;
    errorMessage?: string;
    startedAt?: Date;
    completedAt?: Date;
  }) {
    if (await ProfileService.isDbAvailable()) {
      try {
        await db.insert(jobExecutionLogs).values({
          id: entry.id,
          jobType: entry.jobType,
          status: entry.status,
          source: entry.source,
          itemsProcessed: entry.itemsProcessed || 0,
          itemsSucceeded: entry.itemsSucceeded || 0,
          itemsFailed: entry.itemsFailed || 0,
          errorMessage: entry.errorMessage,
          startedAt: entry.startedAt || new Date(),
          completedAt: entry.completedAt,
        }).onConflictDoUpdate({
          target: jobExecutionLogs.id,
          set: {
            status: entry.status,
            itemsProcessed: entry.itemsProcessed || 0,
            itemsSucceeded: entry.itemsSucceeded || 0,
            errorMessage: entry.errorMessage,
            completedAt: entry.completedAt,
          },
        });
      } catch (err) {
        console.error("[JobWorker] Could not write job log to DB:", err);
      }
    }
  }

  async stop() {
    if (this.scheduleInterval) {
      clearInterval(this.scheduleInterval);
      this.scheduleInterval = null;
    }
    if (this.boss) {
      console.log("[JobWorker] Stopping worker...");
      await this.boss.stop();
      this.isRunning = false;
      console.log("[JobWorker] Worker stopped.");
    }
  }
}

export const worker = new JobWorkerService();

if (process.argv[1]?.endsWith("index.ts") || process.argv[1]?.endsWith("worker")) {
  worker.start();

  process.on("SIGINT", async () => {
    await worker.stop();
    process.exit(0);
  });
  process.on("SIGTERM", async () => {
    await worker.stop();
    process.exit(0);
  });
}
