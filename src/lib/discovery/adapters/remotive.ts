import { JobSourceAdapter, RawDiscoveredJob } from "../types";

export class RemotiveAdapter implements JobSourceAdapter {
  name = "remotive";

  async fetchJobs(options?: { limit?: number; query?: string }): Promise<RawDiscoveredJob[]> {
    const limit = options?.limit || 50;
    const url = `https://remotive.com/api/remote-jobs?category=software-dev&limit=${limit}`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(url, {
        headers: { "User-Agent": "JobPilot-Discovery-Bot/1.0" },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn(`[RemotiveAdapter] HTTP error: ${response.status} ${response.statusText}`);
        return [];
      }

      const data = await response.json();
      const rawJobs = Array.isArray(data.jobs) ? (data.jobs as Array<Record<string, unknown>>) : [];

      return rawJobs.map((item) => ({
        source: "remotive",
        sourceId: String(item.id),
        url: String(item.url || ""),
        title: String(item.title || "Software Engineer"),
        company: String(item.company_name || "Company"),
        location: String(item.candidate_required_location || "Remote"),
        candidateRequiredLocation: String(item.candidate_required_location || ""),
        workMode: "remote",
        description: String(item.description || ""),
        salaryRaw: item.salary ? String(item.salary) : undefined,
        postedAt: item.publication_date ? new Date(String(item.publication_date)) : undefined,
        tags: Array.isArray(item.tags) ? (item.tags as string[]) : [],
        rawPayload: item,
      }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network error";
      console.warn(`[RemotiveAdapter] Fetch failed: ${msg}`);
      return [];
    }
  }
}
