import { createHash } from "crypto";

export function computeUrlHash(url: string): string {
  // Normalize URL by trimming, lowercasing protocol/host, removing tracking query params (utm_*, ref, etc.)
  try {
    const parsed = new URL(url.trim());
    // Remove analytics query params
    const searchParams = new URLSearchParams(parsed.search);
    const trackingPrefixes = ["utm_", "ref", "source", "ref_id", "gh_src"];
    const keysToDelete: string[] = [];

    searchParams.forEach((_, key) => {
      if (trackingPrefixes.some((prefix) => key.startsWith(prefix))) {
        keysToDelete.push(key);
      }
    });

    for (const key of keysToDelete) {
      searchParams.delete(key);
    }

    parsed.search = searchParams.toString();
    const cleanUrl = parsed.toString().toLowerCase().replace(/\/+$/, "");
    return createHash("sha256").update(cleanUrl).digest("hex").slice(0, 32);
  } catch {
    return createHash("sha256").update(url.trim().toLowerCase()).digest("hex").slice(0, 32);
  }
}

export function computeDedupeKey(company: string, title: string, location: string = ""): string {
  const normCompany = company
    .toLowerCase()
    .replace(/[^\w\s]/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  // Normalize common engineering title variants
  const normTitle = title
    .toLowerCase()
    .replace(/\b(sr|sr\.|senior)\b/g, "senior")
    .replace(/\b(jr|jr\.|junior)\b/g, "junior")
    .replace(/\b(assoc|associate)\b/g, "associate")
    .replace(/\b(swe|sde)\b/g, "software engineer")
    .replace(/[^\w\s]/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  const normLocation = location.toLowerCase().includes("remote") ? "remote" : location.toLowerCase().trim();

  return `${normCompany}::${normTitle}::${normLocation}`;
}
