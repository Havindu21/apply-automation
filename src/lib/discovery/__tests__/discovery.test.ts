import { describe, it, expect } from "vitest";
import { evaluateGeographicEligibility } from "../geo-filter";
import { computeUrlHash, computeDedupeKey } from "../dedupe";

describe("Geographic Hiring Eligibility Filter", () => {
  it("approves explicit Worldwide and Work-From-Anywhere remote jobs", () => {
    const result1 = evaluateGeographicEligibility(
      "Worldwide",
      "We are a fully distributed team. You can work from anywhere in the world."
    );
    expect(result1.isEligibleForSriLanka).toBe(true);
    expect(result1.isWorldwideRemote).toBe(true);

    const result2 = evaluateGeographicEligibility(
      "Remote (Worldwide)",
      "Join our engineering team. Open to all countries."
    );
    expect(result2.isEligibleForSriLanka).toBe(true);
  });

  it("approves jobs explicitly mentioning Sri Lanka or APAC", () => {
    const result = evaluateGeographicEligibility(
      "APAC",
      "We are hiring engineers across Asia-Pacific including Sri Lanka and India."
    );
    expect(result.isEligibleForSriLanka).toBe(true);
    expect(result.positiveFlagsFound).toContain("APAC / South Asia");
  });

  it("strictly rejects US-only and US Work Authorization restricted remote jobs", () => {
    const result1 = evaluateGeographicEligibility(
      "United States",
      "Must reside in the US and be authorized to work in the US without sponsorship."
    );
    expect(result1.isEligibleForSriLanka).toBe(false);
    expect(result1.negativeFlagsFound).toContain("Must reside in US");
    expect(result1.negativeFlagsFound).toContain("US Work Auth Required");
    expect(result1.reason).toContain("United States");

    const result2 = evaluateGeographicEligibility(
      "Remote",
      "US Only. Candidates must be on W2. No C2C."
    );
    expect(result2.isEligibleForSriLanka).toBe(false);
    expect(result2.negativeFlagsFound).toContain("US Only");
    expect(result2.negativeFlagsFound).toContain("US W2 Tax Entity");
  });

  it("rejects Europe/UK only and Canada only restricted roles", () => {
    const ukJob = evaluateGeographicEligibility(
      "UK Only",
      "Must be located in the UK with right to work."
    );
    expect(ukJob.isEligibleForSriLanka).toBe(false);

    const euJob = evaluateGeographicEligibility(
      "Europe Only",
      "Must reside in the EU for tax and payroll purposes."
    );
    expect(euJob.isEligibleForSriLanka).toBe(false);
  });

  it("prioritizes negative country restrictions over generic 'remote' wording", () => {
    const trickyJob = evaluateGeographicEligibility(
      "Remote",
      "This is a 100% remote software developer position. However, candidates must reside in the US and have US citizenship."
    );
    expect(trickyJob.isEligibleForSriLanka).toBe(false);
    expect(trickyJob.negativeFlagsFound).toContain("Must reside in US");
  });
});

describe("Deduplication & URL Normalization", () => {
  it("normalizes tracking parameters and generates stable hash", () => {
    const url1 = "https://boards.greenhouse.io/gitlab/jobs/12345?utm_source=linkedin&utm_medium=job_post";
    const url2 = "https://boards.greenhouse.io/gitlab/jobs/12345/";
    const url3 = "HTTPS://BOARDS.GREENHOUSE.IO/gitlab/jobs/12345?ref=jobboard";

    const hash1 = computeUrlHash(url1);
    const hash2 = computeUrlHash(url2);
    const hash3 = computeUrlHash(url3);

    expect(hash1).toBe(hash2);
    expect(hash2).toBe(hash3);
  });

  it("computes normalized composite dedupe keys across title variants", () => {
    const key1 = computeDedupeKey("GitLab Inc.", "Sr. Frontend Engineer", "Remote");
    const key2 = computeDedupeKey("GitLab", "Senior Frontend Engineer", "Remote (Worldwide)");

    expect(key1).toBe("gitlab inc::senior frontend engineer::remote");
    expect(key2).toBe("gitlab::senior frontend engineer::remote");
  });
});
