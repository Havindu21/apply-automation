import { db, pool } from "@/db";
import { applications, jobs } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { ApplicationStatus, ApplicationStateMachine, StateTransitionEvent, TransitionActor } from "../applications/state-machine";
import { TailoredCVSchema } from "../tailoring/verifier";
import { NormalizedJob } from "../discovery/types";

export interface ApplicationPackage {
  id: string;
  jobId: string;
  job?: Partial<NormalizedJob>;
  status: ApplicationStatus;
  tailoredCvJson: TailoredCVSchema;
  coverLetter?: string;
  citedFactIds: string[];
  method: "assisted_form" | "email" | "manual";
  confirmationEvidence?: string;
  history: StateTransitionEvent[];
  createdAt: string;
  updatedAt: string;
}

// In-memory fallback for local dev when Postgres container is inactive
const inMemoryApplications = new Map<string, ApplicationPackage>();

export class ApplicationService {
  private static async isDbAvailable(): Promise<boolean> {
    try {
      const client = await pool.connect();
      client.release();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Upserts an application package. An idempotency check ensures one application per job.
   */
  static async createOrUpdatePackage(data: {
    jobId: string;
    tailoredCv: TailoredCVSchema;
    coverLetter?: string;
    citedFactIds: string[];
    method?: "assisted_form" | "email" | "manual";
    job?: Partial<NormalizedJob>;
  }): Promise<ApplicationPackage> {
    const existing = await this.getApplicationByJobId(data.jobId);
    const appId = existing?.id || `app_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date().toISOString();

    const history: StateTransitionEvent[] = existing?.history || [
      {
        id: `ev_${Date.now()}`,
        applicationId: appId,
        fromStatus: "discovered",
        toStatus: "prepared",
        actor: "system",
        reason: "Initial tailored CV and application package generated.",
        timestamp: now,
      },
      {
        id: `ev_${Date.now() + 1}`,
        applicationId: appId,
        fromStatus: "prepared",
        toStatus: "review",
        actor: "system",
        reason: "Package placed in user Review Queue.",
        timestamp: now,
      },
    ];

    const pkg: ApplicationPackage = {
      id: appId,
      jobId: data.jobId,
      job: data.job || existing?.job,
      status: existing?.status || "review",
      tailoredCvJson: data.tailoredCv,
      coverLetter: data.coverLetter || existing?.coverLetter,
      citedFactIds: data.citedFactIds,
      method: data.method || existing?.method || "assisted_form",
      confirmationEvidence: existing?.confirmationEvidence,
      history,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };

    const dbUp = await this.isDbAvailable();
    if (dbUp) {
      try {
        await db
          .insert(applications)
          .values({
            id: pkg.id,
            jobId: pkg.jobId,
            status: pkg.status,
            tailoredCvJson: pkg.tailoredCvJson as unknown as Record<string, unknown>,
            coverLetter: pkg.coverLetter || null,
            citedFactIds: pkg.citedFactIds,
            method: pkg.method,
            confirmationEvidence: pkg.confirmationEvidence || null,
            updatedAt: new Date(pkg.updatedAt),
          })
          .onConflictDoUpdate({
            target: applications.id,
            set: {
              status: pkg.status,
              tailoredCvJson: pkg.tailoredCvJson as unknown as Record<string, unknown>,
              coverLetter: pkg.coverLetter || null,
              citedFactIds: pkg.citedFactIds,
              method: pkg.method,
              confirmationEvidence: pkg.confirmationEvidence || null,
              updatedAt: new Date(pkg.updatedAt),
            },
          });
      } catch (err) {
        console.warn("DB insert/update failed, maintaining in-memory application package:", err);
      }
    }

    inMemoryApplications.set(pkg.id, pkg);
    return pkg;
  }

  /**
   * Retrieves all applications, optionally filtering or sorting by updatedAt desc.
   */
  static async getApplications(): Promise<ApplicationPackage[]> {
    const dbUp = await this.isDbAvailable();
    if (!dbUp) {
      return Array.from(inMemoryApplications.values()).sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    }

    try {
      const rows = await db
        .select({
          app: applications,
          job: jobs,
        })
        .from(applications)
        .leftJoin(jobs, eq(applications.jobId, jobs.id))
        .orderBy(desc(applications.updatedAt));

      return rows.map(({ app, job }) => {
        const mem = inMemoryApplications.get(app.id);
        const mappedJob: Partial<NormalizedJob> | undefined = job
          ? {
              urlHash: job.id,
              source: job.source,
              sourceId: job.sourceId,
              url: job.url,
              title: job.title,
              company: job.company,
              location: job.location || "Remote",
              workMode: (job.workMode as "remote" | "hybrid" | "onsite" | "unknown") || "unknown",
              isWorldwideRemote: job.isWorldwideRemote,
              allowedLocations: (job.allowedLocations as string[]) || [],
              description: job.description,
              salaryRaw: job.salaryRaw || undefined,
              postedAt: job.postedAt || undefined,
              discoveredAt: job.discoveredAt,
            }
          : mem?.job;

        return {
          id: app.id,
          jobId: app.jobId,
          job: mappedJob,
          status: app.status as ApplicationStatus,
          tailoredCvJson: (app.tailoredCvJson as unknown as TailoredCVSchema) || mem?.tailoredCvJson,
          coverLetter: app.coverLetter || undefined,
          citedFactIds: (app.citedFactIds as string[]) || [],
          method: (app.method as "assisted_form" | "email" | "manual") || "assisted_form",
          confirmationEvidence: app.confirmationEvidence || undefined,
          history: mem?.history || [],
          createdAt: app.createdAt.toISOString(),
          updatedAt: app.updatedAt.toISOString(),
        };
      });
    } catch {
      return Array.from(inMemoryApplications.values());
    }
  }

  /**
   * Get single application by ID.
   */
  static async getApplicationById(id: string): Promise<ApplicationPackage | null> {
    const list = await this.getApplications();
    return list.find((a) => a.id === id) || inMemoryApplications.get(id) || null;
  }

  /**
   * Get single application by Job ID (idempotency helper).
   */
  static async getApplicationByJobId(jobId: string): Promise<ApplicationPackage | null> {
    const list = await this.getApplications();
    return list.find((a) => a.jobId === jobId) || null;
  }

  /**
   * Strictly transitions application state through state machine validator.
   */
  static async transitionStatus(
    id: string,
    targetStatus: ApplicationStatus,
    actor: TransitionActor = "human",
    options?: { reason?: string; evidence?: string }
  ): Promise<ApplicationPackage> {
    const app = await this.getApplicationById(id);
    if (!app) {
      throw new Error(`Application with ID "${id}" not found.`);
    }

    const validation = ApplicationStateMachine.validateTransition(app.status, targetStatus, actor);
    if (!validation.valid) {
      throw new Error(validation.error || `Invalid state transition from ${app.status} to ${targetStatus}`);
    }

    const now = new Date().toISOString();
    const event: StateTransitionEvent = {
      id: `ev_${Date.now()}`,
      applicationId: id,
      fromStatus: app.status,
      toStatus: targetStatus,
      actor,
      reason: options?.reason,
      evidence: options?.evidence,
      timestamp: now,
    };

    app.status = targetStatus;
    app.updatedAt = now;
    if (options?.evidence) {
      app.confirmationEvidence = options.evidence;
    }
    app.history = [...(app.history || []), event];

    const dbUp = await this.isDbAvailable();
    if (dbUp) {
      try {
        await db
          .update(applications)
          .set({
            status: targetStatus,
            confirmationEvidence: app.confirmationEvidence || null,
            updatedAt: new Date(now),
          })
          .where(eq(applications.id, id));
      } catch (err) {
        console.warn("DB transition update failed, using in-memory update:", err);
      }
    }

    inMemoryApplications.set(app.id, app);
    return app;
  }
}
