export type WorkMode = "remote" | "hybrid" | "onsite" | "unknown";

export interface RawDiscoveredJob {
  source: string; // e.g. "remotive" | "remoteok" | "jobicy" | "weworkremotely" | "greenhouse" | "lever" | "manual"
  sourceId: string;
  url: string;
  title: string;
  company: string;
  location?: string;
  workMode?: WorkMode;
  candidateRequiredLocation?: string;
  description: string;
  salaryRaw?: string;
  postedAt?: Date | string;
  tags?: string[];
  rawPayload?: Record<string, unknown>;
}

export interface GeographicEligibilityResult {
  isEligibleForSriLanka: boolean;
  isWorldwideRemote: boolean;
  detectedRegion: string;
  reason: string;
  negativeFlagsFound: string[];
  positiveFlagsFound: string[];
}

export interface NormalizedJob {
  source: string;
  sourceId: string;
  url: string;
  urlHash: string;
  dedupeKey: string;
  title: string;
  company: string;
  location: string;
  workMode: WorkMode;
  isWorldwideRemote: boolean;
  allowedLocations: string[];
  description: string;
  salaryRaw?: string;
  postedAt?: Date;
  discoveredAt: Date;
  eligibility: GeographicEligibilityResult;
  status: "discovered" | "filtered_out" | "matched" | "archived";
}

export interface JobSourceAdapter {
  name: string;
  fetchJobs(options?: { limit?: number; query?: string; companySlug?: string }): Promise<RawDiscoveredJob[]>;
}
