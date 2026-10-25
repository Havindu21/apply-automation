import { JobSourceAdapter, RawDiscoveredJob } from "../types";

export class JobicyAdapter implements JobSourceAdapter {
  name = "jobicy";

  async fetchJobs(options?: { limit?: number }): Promise<RawDiscoveredJob[]> {
    const limit = options?.limit || 50;
    const url = `https://jobicy.com/api/v2/remote-jobs?count=${limit}&tag=dev`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(url, {
        headers: { "User-Agent": "JobPilot-App/1.0" },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn(`[JobicyAdapter] HTTP error: ${response.status}`);
        return [];
      }

      const data = await response.json();
      const rawJobs = Array.isArray(data.jobs) ? (data.jobs as Array<Record<string, unknown>>) : [];

      return rawJobs.map((item) => ({
        source: "jobicy",
        sourceId: String(item.id),
        url: String(item.url || ""),
        title: String(item.jobTitle || "Software Engineer"),
        company: String(item.companyName || "Company"),
        location: String(item.jobGeo || "Worldwide"),
        candidateRequiredLocation: String(item.jobGeo || ""),
        workMode: "remote",
        description: String(item.jobDescription || item.jobExcerpt || ""),
        salaryRaw: item.annualSalaryMin && item.annualSalaryMax ? `$${item.annualSalaryMin} - $${item.annualSalaryMax}` : undefined,
        postedAt: item.pubDate ? new Date(String(item.pubDate)) : undefined,
        tags: Array.isArray(item.jobIndustry) ? (item.jobIndustry as string[]) : [],
        rawPayload: item,
      }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network error";
      console.warn(`[JobicyAdapter] Fetch failed: ${msg}`);
      return [];
    }
  }
}
