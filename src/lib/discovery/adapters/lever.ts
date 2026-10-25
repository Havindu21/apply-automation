import { JobSourceAdapter, RawDiscoveredJob } from "../types";

export class LeverAdapter implements JobSourceAdapter {
  name = "lever";

  private defaultWatchlist = [
    "netflix",
    "atlassian",
    "palantir",
    "figma",
  ];

  async fetchJobs(options?: { companySlug?: string; limit?: number }): Promise<RawDiscoveredJob[]> {
    const companies = options?.companySlug ? [options.companySlug] : this.defaultWatchlist;
    const limit = options?.limit || 30;
    const allJobs: RawDiscoveredJob[] = [];

    for (const company of companies) {
      const url = `https://api.lever.co/v0/postings/${company}?mode=json`;

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
        const postings = Array.isArray(data) ? data : [];

        for (const post of postings) {
          const workplaceType = post.workplaceType || "";
          const location = post.categories?.location || "Remote";

          allJobs.push({
            source: "lever",
            sourceId: String(post.id),
            url: post.hostedUrl || post.applyUrl,
            title: post.text,
            company: company.charAt(0).toUpperCase() + company.slice(1),
            location,
            workMode: workplaceType.toLowerCase() === "remote" || location.toLowerCase().includes("remote") ? "remote" : "unknown",
            description: post.descriptionPlain || post.description || "",
            postedAt: post.createdAt ? new Date(post.createdAt) : undefined,
            rawPayload: post,
          });

          if (allJobs.length >= limit) break;
        }

        if (allJobs.length >= limit) break;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Lever error";
        console.warn(`[LeverAdapter] Company '${company}' error: ${msg}`);
      }
    }

    return allJobs;
  }
}
