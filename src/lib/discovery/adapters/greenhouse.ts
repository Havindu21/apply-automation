import { JobSourceAdapter, RawDiscoveredJob } from "../types";

export class GreenhouseAdapter implements JobSourceAdapter {
  name = "greenhouse";

  // Curated target companies that use Greenhouse and hire remote software engineers
  private defaultWatchlist = [
    "gitlab",
    "automattic",
    "canonical",
    "sourcegraph",
    "elastic",
    "postman",
    "docker",
  ];

  async fetchJobs(options?: { companySlug?: string; limit?: number }): Promise<RawDiscoveredJob[]> {
    const boards = options?.companySlug ? [options.companySlug] : this.defaultWatchlist;
    const limit = options?.limit || 40;
    const allJobs: RawDiscoveredJob[] = [];

    for (const board of boards) {
      const url = `https://boards-api.greenhouse.io/v1/boards/${board}/jobs?content=true`;

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const response = await fetch(url, {
          headers: { "User-Agent": "JobPilot-App/1.0" },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!response.ok) continue;

        const data = await response.json();
        const jobs = Array.isArray(data.jobs) ? data.jobs : [];

        for (const job of jobs) {
          const locationName = job.location?.name || "Remote";
          allJobs.push({
            source: "greenhouse",
            sourceId: String(job.id),
            url: job.absolute_url,
            title: job.title,
            company: board.charAt(0).toUpperCase() + board.slice(1),
            location: locationName,
            workMode: locationName.toLowerCase().includes("remote") ? "remote" : "unknown",
            description: job.content || "",
            postedAt: job.updated_at ? new Date(job.updated_at) : undefined,
            rawPayload: job,
          });

          if (allJobs.length >= limit) break;
        }

        if (allJobs.length >= limit) break;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Greenhouse error";
        console.warn(`[GreenhouseAdapter] Board '${board}' error: ${msg}`);
      }
    }

    return allJobs;
  }
}
