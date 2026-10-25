import { JobSourceAdapter, RawDiscoveredJob } from "../types";

export class WeWorkRemotelyAdapter implements JobSourceAdapter {
  name = "weworkremotely";

  async fetchJobs(options?: { limit?: number }): Promise<RawDiscoveredJob[]> {
    const limit = options?.limit || 30;
    const feedUrls = [
      "https://weworkremotely.com/categories/remote-full-stack-programming-jobs.rss",
      "https://weworkremotely.com/categories/remote-front-end-programming-jobs.rss",
      "https://weworkremotely.com/categories/remote-back-end-programming-jobs.rss",
    ];

    const allJobs: RawDiscoveredJob[] = [];

    for (const url of feedUrls) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const response = await fetch(url, {
          headers: { "User-Agent": "JobPilot-App/1.0" },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!response.ok) continue;

        const xmlText = await response.text();
        const items = this.parseRssItems(xmlText);

        for (const item of items) {
          allJobs.push({
            source: "weworkremotely",
            sourceId: item.guid || item.link,
            url: item.link,
            title: item.title,
            company: item.company || "Company",
            location: item.location || "Remote",
            workMode: "remote",
            description: item.description,
            postedAt: item.pubDate ? new Date(item.pubDate) : undefined,
          });

          if (allJobs.length >= limit) break;
        }

        if (allJobs.length >= limit) break;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "RSS error";
        console.warn(`[WeWorkRemotelyAdapter] Failed to fetch feed ${url}: ${msg}`);
      }
    }

    return allJobs;
  }

  private parseRssItems(xml: string) {
    const items: Array<{
      title: string;
      company?: string;
      link: string;
      guid?: string;
      pubDate?: string;
      description: string;
      location?: string;
    }> = [];

    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;

    while ((match = itemRegex.exec(xml)) !== null) {
      const itemXml = match[1];

      const titleMatch = itemXml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || itemXml.match(/<title>(.*?)<\/title>/);
      const linkMatch = itemXml.match(/<link>(.*?)<\/link>/);
      const guidMatch = itemXml.match(/<guid.*?>(.*?)<\/guid>/);
      const pubDateMatch = itemXml.match(/<pubDate>(.*?)<\/pubDate>/);
      const descMatch = itemXml.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/) || itemXml.match(/<description>([\s\S]*?)<\/description>/);

      const rawTitle = titleMatch ? titleMatch[1].trim() : "Software Engineer";
      // WeWorkRemotely RSS titles often format as "Company: Job Title"
      let company = "Company";
      let title = rawTitle;
      if (rawTitle.includes(":")) {
        const parts = rawTitle.split(":");
        company = parts[0].trim();
        title = parts.slice(1).join(":").trim();
      }

      const link = linkMatch ? linkMatch[1].trim() : "";
      if (!link) continue;

      items.push({
        title,
        company,
        link,
        guid: guidMatch ? guidMatch[1].trim() : link,
        pubDate: pubDateMatch ? pubDateMatch[1].trim() : undefined,
        description: descMatch ? descMatch[1].trim() : "",
        location: "Remote",
      });
    }

    return items;
  }
}
