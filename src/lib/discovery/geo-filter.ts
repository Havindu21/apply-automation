import { GeographicEligibilityResult } from "./types";

const NEGATIVE_REGION_PATTERNS = [
  { pattern: /\b(us only|usa only|united states only|only us|us-only)\b/i, flag: "US Only" },
  { pattern: /\b(must reside in (the )?us|must be (located|based) in (the )?us)\b/i, flag: "Must reside in US" },
  { pattern: /\b(us citizens? only|u\.s\. citizens?)\b/i, flag: "US Citizen Only" },
  { pattern: /\b(authorized to work in the (us|united states)|us work authorization)\b/i, flag: "US Work Auth Required" },
  { pattern: /\b(w2 only|no c2c|c2c not allowed)\b/i, flag: "US W2 Tax Entity" },
  { pattern: /\b(north america only|na only)\b/i, flag: "North America Only" },
  { pattern: /\b(canada only|must reside in canada)\b/i, flag: "Canada Only" },
  { pattern: /\b(uk only|united kingdom only|must reside in (the )?uk)\b/i, flag: "UK Only" },
  { pattern: /\b(eu only|europe only|must reside in (the )?eu|emea only)\b/i, flag: "EU/EMEA Only" },
  { pattern: /\b(latam only|latin america only)\b/i, flag: "LATAM Only" },
  { pattern: /\b(australia only|must reside in australia)\b/i, flag: "Australia Only" },
];

const POSITIVE_REGION_PATTERNS = [
  { pattern: /\b(sri lanka|colombo)\b/i, flag: "Explicit Sri Lanka" },
  { pattern: /\b(worldwide|remote \(worldwide\)|work from anywhere|anywhere in the world)\b/i, flag: "Worldwide Remote" },
  { pattern: /\b(global|anywhere|any location|all locations|open to all countries)\b/i, flag: "Global / Any Location" },
  { pattern: /\b(apac|asia[- ]pacific|south asia|asia timezone)\b/i, flag: "APAC / South Asia" },
];

export function evaluateGeographicEligibility(
  locationString: string = "",
  descriptionText: string = "",
  candidateRequiredLocation: string = ""
): GeographicEligibilityResult {
  const combinedText = `${locationString} ${candidateRequiredLocation} ${descriptionText.slice(0, 3000)}`;

  const negativeFlags: string[] = [];
  for (const { pattern, flag } of NEGATIVE_REGION_PATTERNS) {
    if (pattern.test(combinedText)) {
      negativeFlags.push(flag);
    }
  }

  const positiveFlags: string[] = [];
  for (const { pattern, flag } of POSITIVE_REGION_PATTERNS) {
    if (pattern.test(combinedText)) {
      positiveFlags.push(flag);
    }
  }

  // Check explicit location metadata first
  const explicitLoc = `${locationString} ${candidateRequiredLocation}`.toLowerCase();
  const isExplicitWorldwide =
    explicitLoc.includes("worldwide") ||
    explicitLoc.includes("anywhere") ||
    explicitLoc.includes("global") ||
    explicitLoc.includes("all locations") ||
    explicitLoc.includes("sri lanka");

  const isExplicitRestricted =
    explicitLoc.includes("usa only") ||
    explicitLoc.includes("us only") ||
    explicitLoc.includes("united states") ||
    explicitLoc.includes("north america") ||
    explicitLoc.includes("europe") ||
    explicitLoc.includes("uk only") ||
    explicitLoc.includes("canada");

  // Determine eligibility
  let isEligible = true;
  let isWorldwide = false;
  let reason = "Worldwide or regionally unrestricted role.";
  let detectedRegion = "Worldwide / Open";

  if (isExplicitRestricted && !isExplicitWorldwide) {
    isEligible = false;
    isWorldwide = false;
    detectedRegion = locationString || candidateRequiredLocation || "Restricted Jurisdiction";
    reason = `Explicitly restricted to ${detectedRegion}. Candidate in Sri Lanka is ineligible.`;
  } else if (negativeFlags.length > 0 && positiveFlags.length === 0) {
    isEligible = false;
    isWorldwide = false;
    detectedRegion = negativeFlags.join(", ");
    reason = `Negative location constraints detected (${negativeFlags.join(", ")}).`;
  } else if (positiveFlags.length > 0) {
    isEligible = true;
    isWorldwide = positiveFlags.some((f) => f.includes("Worldwide") || f.includes("Global"));
    detectedRegion = positiveFlags.join(", ");
    reason = `Confirmed eligible for Sri Lanka applicants (${detectedRegion}).`;
  } else if (locationString.trim().toLowerCase() === "remote") {
    // Unspecified remote - conditionally eligible but flagged
    isEligible = true;
    isWorldwide = true;
    detectedRegion = "Remote (Unspecified)";
    reason = "Posting specified 'Remote' without explicit country restrictions.";
  } else {
    // Unknown location
    isEligible = false;
    detectedRegion = locationString || "Unknown";
    reason = `Location is specified as '${locationString || "Unknown"}' and is not clearly open to Sri Lanka applicants.`;
  }

  return {
    isEligibleForSriLanka: isEligible,
    isWorldwideRemote: isWorldwide,
    detectedRegion,
    reason,
    negativeFlagsFound: negativeFlags,
    positiveFlagsFound: positiveFlags,
  };
}
