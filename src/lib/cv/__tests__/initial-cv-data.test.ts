import { describe, it, expect } from "vitest";
import { initialImportedCVProfile } from "../initial-cv-data";
import { FullProfileSchema } from "../../validation/profile";

describe("Initial CV Profile Import Data", () => {
  it("validates cleanly against FullProfileSchema", () => {
    const result = FullProfileSchema.safeParse(initialImportedCVProfile);
    expect(result.success).toBe(true);
  });

  it("ensures ALL imported facts start in an UNVERIFIED state", () => {
    // Experience facts
    for (const exp of initialImportedCVProfile.experiences) {
      for (const fact of exp.facts) {
        expect(fact.isVerified).toBe(false);
        expect(fact.source).toBe("cv_import");
      }
    }

    // Project facts
    for (const proj of initialImportedCVProfile.projects) {
      for (const fact of proj.facts) {
        expect(fact.isVerified).toBe(false);
        expect(fact.source).toBe("cv_import");
      }
    }
  });

  it("contains all 5 career target profiles referencing real skills", () => {
    expect(initialImportedCVProfile.careerProfiles.length).toBe(5);
    const titles = initialImportedCVProfile.careerProfiles.map((cp) => cp.title);
    expect(titles.some((t) => t.includes("Frontend"))).toBe(true);
    expect(titles.some((t) => t.includes("Full-Stack"))).toBe(true);
    expect(titles.some((t) => t.includes("Backend"))).toBe(true);
    expect(titles.some((t) => t.includes("Flutter"))).toBe(true);
    expect(titles.some((t) => t.includes("AI Application"))).toBe(true);
  });

  it("defaults to remote-only with Sri Lanka worldwide eligibility filter enabled", () => {
    expect(initialImportedCVProfile.preferences.workModes.remote).toBe(true);
    expect(initialImportedCVProfile.preferences.workModes.hybrid).toBe(false);
    expect(initialImportedCVProfile.preferences.workModes.onsite).toBe(false);
    expect(initialImportedCVProfile.preferences.allowSriLankaRemoteOnly).toBe(true);
  });
});
