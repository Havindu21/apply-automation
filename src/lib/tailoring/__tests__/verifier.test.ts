import { describe, it, expect } from "vitest";
import { CVTruthVerifier, TailoredCVSchema } from "../verifier";
import { initialImportedCVProfile } from "../../cv/initial-cv-data";
import { FullProfile } from "../../validation/profile";

describe("CVTruthVerifier (Deterministic Zero-Hallucination Guard)", () => {
  // Create profile with verified facts for testing
  const verifiedProfile: FullProfile = JSON.parse(JSON.stringify(initialImportedCVProfile));
  for (const exp of verifiedProfile.experiences) {
    for (const f of exp.facts) f.isVerified = true;
  }
  for (const proj of verifiedProfile.projects) {
    for (const f of proj.facts) f.isVerified = true;
  }

  const validCV: TailoredCVSchema = {
    headline: "Frontend Engineer (React / Next.js)",
    summary: "Experienced associate software engineer with proven track record in React performance.",
    highlightSkills: ["React", "Next.js", "Redux Toolkit"],
    experiences: [
      {
        company: "Mobios Private Limited",
        role: "Associate Software Engineer",
        startDate: "2024-02",
        endDate: null,
        bullets: [
          {
            text: "Eliminated filter-based API request race conditions using AbortController with useEffect cleanup so stale responses no longer overwrite the UI.",
            citedFactIds: ["fact-calsda-race-conditions"],
          },
        ],
      },
    ],
    projects: [
      {
        name: "BuildBusinessLK",
        technologies: ["React", "Next.js"],
        bullets: [
          {
            text: "Built a RAG-based AI assistant using LangChain and FAISS.",
            citedFactIds: ["fact-buildbusiness-rag"],
          },
        ],
      },
    ],
    unsupportedRequirements: ["GraphQL", "Docker Swarm"],
  };

  it("passes when all claims strictly cite verified fact IDs without metric hallucinations", () => {
    const result = CVTruthVerifier.verify(validCV, verifiedProfile);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.verifiedFactCount).toBe(2);
  });

  it("fails verification if a bullet has zero cited fact IDs", () => {
    const invalidCV = structuredClone(validCV);
    invalidCV.experiences[0].bullets[0].citedFactIds = [];

    const result = CVTruthVerifier.verify(invalidCV, verifiedProfile);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes("Zero fact IDs cited"))).toBe(true);
  });

  it("fails verification if a bullet cites an unverified fact ID", () => {
    const unverifiedProfile = structuredClone(verifiedProfile);
    // Mark one fact as unverified
    unverifiedProfile.experiences[0].facts[1].isVerified = false; // fact-calsda-race-conditions

    const result = CVTruthVerifier.verify(validCV, unverifiedProfile);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes("is UNVERIFIED"))).toBe(true);
  });

  it("fails verification if a bullet cites a non-existent fact ID", () => {
    const invalidCV = structuredClone(validCV);
    invalidCV.experiences[0].bullets[0].citedFactIds = ["fact-non-existent-1234"];

    const result = CVTruthVerifier.verify(invalidCV, verifiedProfile);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes("does not exist in the candidate profile"))).toBe(true);
  });

  it("fails verification if LLM introduces a hallucinated number or metric", () => {
    const hallucinatedMetricCV = structuredClone(validCV);
    // Introduce metric "50%" or "10,000" that never appeared in the fact text
    hallucinatedMetricCV.experiences[0].bullets[0].text =
      "Eliminated filter-based API request race conditions using AbortController, improving response speed by 50% across 1000 users.";

    const result = CVTruthVerifier.verify(hallucinatedMetricCV, verifiedProfile);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes("Metric Hallucination Guard"))).toBe(true);
  });

  it("fails verification if an unverified technology or skill is inserted", () => {
    const hallucinatedSkillCV = structuredClone(validCV);
    // Add Kubernetes or Rust which candidate never listed
    hallucinatedSkillCV.highlightSkills.push("Kubernetes");

    const result = CVTruthVerifier.verify(hallucinatedSkillCV, verifiedProfile);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes("Hallucinated Skill Detected: 'Kubernetes'"))).toBe(true);
  });

  it("fails verification if bullet inflates seniority from contributor to team lead/architect without fact evidence", () => {
    const inflatedCV = structuredClone(validCV);
    inflatedCV.experiences[0].bullets[0].text =
      "Served as Team Lead and headed the team to eliminate API race conditions.";

    const result = CVTruthVerifier.verify(inflatedCV, verifiedProfile);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes("Seniority/Role Inflation Guard"))).toBe(true);
  });

  it("flags subjective exaggerations or hyperbolic paraphrases for human review", () => {
    const subjectiveCV = structuredClone(validCV);
    subjectiveCV.experiences[0].bullets[0].text =
      "Flawlessly eliminated filter-based API request race conditions with world-class engineering.";

    const result = CVTruthVerifier.verify(subjectiveCV, verifiedProfile);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings.some((w) => w.includes("Semantic Paraphrase Flag"))).toBe(true);
  });
});
