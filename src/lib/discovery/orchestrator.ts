import { RawDiscoveredJob, NormalizedJob, JobSourceAdapter } from "./types";
import { evaluateGeographicEligibility } from "./geo-filter";
import { computeUrlHash, computeDedupeKey } from "./dedupe";
import { RemotiveAdapter } from "./adapters/remotive";
import { RemoteOKAdapter } from "./adapters/remoteok";
import { JobicyAdapter } from "./adapters/jobicy";
import { WeWorkRemotelyAdapter } from "./adapters/weworkremotely";
import { GreenhouseAdapter } from "./adapters/greenhouse";
import { LeverAdapter } from "./adapters/lever";
import { ProfileService } from "../services/profile-service";
import { db } from "@/db";
import { jobs } from "@/db/schema";

export interface DiscoveryResult {
  totalFetched: number;
  totalNew: number;
  totalEligible: number;
  totalFilteredOut: number;
  duplicatesSkipped: number;
  sourceBreakdown: Record<string, { fetched: number; eligible: number }>;
  jobs: NormalizedJob[];
}

// In-memory job repository fallback
let inMemoryJobs: NormalizedJob[] = [];

export class DiscoveryOrchestrator {
  private adapters: Map<string, JobSourceAdapter> = new Map();

  constructor() {
    this.registerAdapter(new RemotiveAdapter());
    this.registerAdapter(new RemoteOKAdapter());
    this.registerAdapter(new JobicyAdapter());
    this.registerAdapter(new WeWorkRemotelyAdapter());
    this.registerAdapter(new GreenhouseAdapter());
    this.registerAdapter(new LeverAdapter());
  }

  registerAdapter(adapter: JobSourceAdapter) {
    this.adapters.set(adapter.name, adapter);
  }

  async runDiscovery(options?: {
    source?: string;
    limitPerSource?: number;
    companySlug?: string;
  }): Promise<DiscoveryResult> {
    const profile = await ProfileService.getProfile();
    const prefs = profile.preferences;

    const sourcesToRun: JobSourceAdapter[] = [];
    if (options?.source && options.source !== "all") {
      const adapter = this.adapters.get(options.source);
      if (adapter) sourcesToRun.push(adapter);
    } else {
      sourcesToRun.push(...this.adapters.values());
    }

    const rawJobs: RawDiscoveredJob[] = [];
    const sourceBreakdown: Record<string, { fetched: number; eligible: number }> = {};

    // 1. Fetch in parallel from all chosen sources
    const fetchPromises = sourcesToRun.map(async (adapter) => {
      try {
        const fetched = await adapter.fetchJobs({
          limit: options?.limitPerSource || 25,
          companySlug: options?.companySlug,
        });
        sourceBreakdown[adapter.name] = { fetched: fetched.length, eligible: 0 };
        return fetched;
      } catch (err) {
        console.warn(`[DiscoveryOrchestrator] Adapter '${adapter.name}' failed:`, err);
        sourceBreakdown[adapter.name] = { fetched: 0, eligible: 0 };
        return [];
      }
    });

    const results = await Promise.all(fetchPromises);
    for (const batch of results) {
      rawJobs.push(...batch);
    }

    // 2. Normalize, filter and deduplicate
    const normalized: NormalizedJob[] = [];
    const seenHashes = new Set<string>();
    const seenDedupeKeys = new Set<string>();

    let totalEligible = 0;
    let totalFilteredOut = 0;
    let duplicatesSkipped = 0;

    for (const raw of rawJobs) {
      const urlHash = computeUrlHash(raw.url);
      const dedupeKey = computeDedupeKey(raw.company, raw.title, raw.location);

      if (seenHashes.has(urlHash) || seenDedupeKeys.has(dedupeKey)) {
        duplicatesSkipped++;
        continue;
      }

      seenHashes.add(urlHash);
      seenDedupeKeys.add(dedupeKey);

      // Evaluate geographic eligibility
      const geoResult = evaluateGeographicEligibility(
        raw.location || "",
        raw.description || "",
        raw.candidateRequiredLocation || ""
      );

      // Check user preferences
      const isWorkModeMatched = this.matchesWorkMode(raw.workMode || "remote", prefs.workModes);
      const isExcludedCompany = prefs.excludedCompanies.some(
        (c) => c.toLowerCase() === raw.company.toLowerCase()
      );

      // Final eligibility determination
      let status: "discovered" | "filtered_out" = "discovered";
      if (!isWorkModeMatched || isExcludedCompany) {
        status = "filtered_out";
        totalFilteredOut++;
      } else if (prefs.allowSriLankaRemoteOnly && !geoResult.isEligibleForSriLanka) {
        status = "filtered_out";
        totalFilteredOut++;
      } else {
        totalEligible++;
        if (sourceBreakdown[raw.source]) {
          sourceBreakdown[raw.source].eligible++;
        }
      }

      const job: NormalizedJob = {
        source: raw.source,
        sourceId: raw.sourceId,
        url: raw.url,
        urlHash,
        dedupeKey,
        title: raw.title,
        company: raw.company,
        location: raw.location || "Remote",
        workMode: raw.workMode || "remote",
        isWorldwideRemote: geoResult.isWorldwideRemote,
        allowedLocations: geoResult.positiveFlagsFound,
        description: raw.description,
        salaryRaw: raw.salaryRaw,
        postedAt: raw.postedAt ? new Date(raw.postedAt) : undefined,
        discoveredAt: new Date(),
        eligibility: geoResult,
        status,
      };

      normalized.push(job);
    }

    // 3. Persist jobs
    await this.persistJobs(normalized);

    return {
      totalFetched: rawJobs.length,
      totalNew: normalized.length,
      totalEligible,
      totalFilteredOut,
      duplicatesSkipped,
      sourceBreakdown,
      jobs: normalized,
    };
  }

  private matchesWorkMode(
    jobMode: "remote" | "hybrid" | "onsite" | "unknown",
    userModes: { remote: boolean; hybrid: boolean; onsite: boolean }
  ): boolean {
    if (jobMode === "remote" && userModes.remote) return true;
    if (jobMode === "hybrid" && userModes.hybrid) return true;
    if (jobMode === "onsite" && userModes.onsite) return true;
    if (jobMode === "unknown" && userModes.remote) return true; // conservative fallback
    return false;
  }

  private async persistJobs(jobList: NormalizedJob[]) {
    // In-memory update
    const existingMap = new Map(inMemoryJobs.map((j) => [j.urlHash, j]));
    for (const job of jobList) {
      existingMap.set(job.urlHash, job);
    }
    inMemoryJobs = Array.from(existingMap.values());

    // Postgres update if connected
    if (await ProfileService.isDbAvailable()) {
      try {
        for (const job of jobList) {
          await db
            .insert(jobs)
            .values({
              id: `job-${job.urlHash}`,
              source: job.source,
              sourceId: job.sourceId,
              urlHash: job.urlHash,
              url: job.url,
              title: job.title,
              company: job.company,
              location: job.location,
              workMode: job.workMode,
              isWorldwideRemote: job.isWorldwideRemote,
              allowedLocations: job.allowedLocations,
              description: job.description,
              salaryRaw: job.salaryRaw,
              postedAt: job.postedAt,
              discoveredAt: job.discoveredAt,
              status: job.status,
            })
            .onConflictDoUpdate({
              target: jobs.urlHash,
              set: {
                title: job.title,
                status: job.status,
                isWorldwideRemote: job.isWorldwideRemote,
              },
            });
        }
      } catch (err) {
        console.error("[DiscoveryOrchestrator] Error persisting to DB:", err);
      }
    }
  }

  static async getStoredJobs(options?: {
    eligibleOnly?: boolean;
    workMode?: string;
    search?: string;
    limit?: number;
  }): Promise<NormalizedJob[]> {
    let result = [...inMemoryJobs];

    if (options?.eligibleOnly) {
      result = result.filter((j) => j.status === "discovered" && j.eligibility.isEligibleForSriLanka);
    }
    if (options?.workMode && options.workMode !== "all") {
      result = result.filter((j) => j.workMode === options.workMode);
    }
    if (options?.search) {
      const q = options.search.toLowerCase();
      result = result.filter(
        (j) =>
          j.title.toLowerCase().includes(q) ||
          j.company.toLowerCase().includes(q) ||
          j.description.toLowerCase().includes(q)
      );
    }

    return result.slice(0, options?.limit || 100);
  }

  static async addManualJob(job: NormalizedJob): Promise<void> {
    inMemoryJobs.unshift(job);
    if (await ProfileService.isDbAvailable()) {
      try {
        await db
          .insert(jobs)
          .values({
            id: `job-${job.urlHash}`,
            source: job.source,
            sourceId: job.sourceId,
            urlHash: job.urlHash,
            url: job.url,
            title: job.title,
            company: job.company,
            location: job.location,
            workMode: job.workMode,
            isWorldwideRemote: job.isWorldwideRemote,
            allowedLocations: job.allowedLocations,
            description: job.description,
            salaryRaw: job.salaryRaw,
            postedAt: job.postedAt,
            discoveredAt: job.discoveredAt,
            status: job.status,
          })
          .onConflictDoNothing({ target: jobs.urlHash });
      } catch (err) {
        console.error("Failed to add manual job to DB:", err);
      }
    }
  }
}

export const discoveryOrchestrator = new DiscoveryOrchestrator();
