import { JobSourceAdapter, RawDiscoveredJob } from "../types";

export class RemoteOKAdapter implements JobSourceAdapter {
  name = "remoteok";

  async fetchJobs(options?: { limit?: number }): Promise<RawDiscoveredJob[]> {
    const limit = options?.limit || 50;
    const url = "https://remoteok.com/api";

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(url, {
        headers: {
          "User-Agent": "JobPilot-App/1.0 (Personal Job Search Copilot)",
          Accept: "application/json",
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn(`[RemoteOKAdapter] HTTP error: ${response.status}`);
        return [];
      }

      const data = await response.json();
      if (!Array.isArray(data)) return [];

      // First entry in RemoteOK response is metadata / legal text, skip it
      const jobEntries = (data as Array<Record<string, unknown>>)
        .filter((item) => item && item.id && item.position)
        .slice(0, limit);

      return jobEntries.map((item) => ({
        source: "remoteok",
        sourceId: String(item.id),
        url: item.url ? `https://remoteok.com/remote-jobs/${item.id}` : `https://remoteok.com/l/${item.id}`,
        title: String(item.position || "Software Engineer"),
        company: String(item.company || "Company"),
        location: String(item.location || "Worldwide"),
        candidateRequiredLocation: String(item.location || ""),
        workMode: "remote",
        description: String(item.description || ""),
        salaryRaw: item.salary_min && item.salary_max ? `$${item.salary_min} - $${item.salary_max}` : undefined,
        postedAt: item.date ? new Date(String(item.date)) : undefined,
        tags: Array.isArray(item.tags) ? (item.tags as string[]) : [],
        rawPayload: item,
      }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Network error";
      console.warn(`[RemoteOKAdapter] Fetch failed: ${msg}`);
      return [];
    }
  }
}
