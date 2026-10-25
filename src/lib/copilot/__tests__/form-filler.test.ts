import { describe, it, expect } from "vitest";
import { FormCopilot } from "../form-filler";
import { initialImportedCVProfile } from "../../cv/initial-cv-data";
import { TailoredCVSchema } from "../../tailoring/verifier";

describe("FormCopilot", () => {
  const sampleCV: TailoredCVSchema = {
    headline: "Frontend Engineer | React & TypeScript",
    summary: "Experienced developer building performant web applications.",
    highlightSkills: ["React", "TypeScript", "Next.js"],
    experiences: [],
    projects: [],
    unsupportedRequirements: [],
  };

  it("extracts clean candidate form payload with first/last names separated", () => {
    const payload = FormCopilot.prepareFormPayload(initialImportedCVProfile, sampleCV);

    expect(payload.fullName).toBe(initialImportedCVProfile.fullName);
    expect(payload.firstName).toBe("Havindu");
    expect(payload.lastName).toBe("Hesara");
    expect(payload.email).toBe(initialImportedCVProfile.email);
    expect(payload.headline).toBe("Frontend Engineer | React & TypeScript");
    expect(payload.skillsList).toContain("React, TypeScript, Next.js");
  });

  it("accurately detects ATS platforms from URLs", () => {
    expect(FormCopilot.detectAtsPlatform("https://boards.greenhouse.io/stripe/jobs/12345")).toBe("greenhouse");
    expect(FormCopilot.detectAtsPlatform("https://jobs.lever.co/figma/67890")).toBe("lever");
    expect(FormCopilot.detectAtsPlatform("https://jobs.ashbyhq.com/linear/abcde")).toBe("ashby");
    expect(FormCopilot.detectAtsPlatform("https://careers.company.com/apply/123")).toBe("generic");
  });
});
