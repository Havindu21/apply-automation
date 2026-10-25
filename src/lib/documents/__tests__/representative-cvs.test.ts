import { describe, it, expect } from "vitest";
import { PDFGenerator } from "../pdf-generator";
import { generateATSSemanticHTML } from "../ats-template";
import { initialImportedCVProfile } from "../../cv/initial-cv-data";
import { CVTruthVerifier, TailoredCVSchema } from "../../tailoring/verifier";
import { FullProfile } from "../../validation/profile";

describe("Phase E: ATS & Multi-Profile PDF Compatibility Audit", () => {
  // Verified profile fixture
  const verifiedProfile: FullProfile = JSON.parse(JSON.stringify(initialImportedCVProfile));
  for (const exp of verifiedProfile.experiences) {
    for (const f of exp.facts) f.isVerified = true;
  }
  for (const proj of verifiedProfile.projects) {
    for (const f of proj.facts) f.isVerified = true;
  }

  const profilesToTest: Array<{
    targetRole: string;
    skills: string[];
    headline: string;
    experienceBullets: Array<{ text: string; citedFactIds: string[] }>;
    projectBullets: Array<{ text: string; citedFactIds: string[] }>;
  }> = [
    {
      targetRole: "React Frontend Engineer",
      skills: ["React", "Next.js", "Redux Toolkit", "MUI (Material UI)", "Frontend Performance & Optimization"],
      headline: "Frontend Engineer | React • Next.js • TypeScript",
      experienceBullets: [
        {
          text: "Eliminated filter-based API request race conditions using AbortController with useEffect cleanup so stale responses no longer overwrite the UI.",
          citedFactIds: ["fact-calsda-race-conditions"],
        },
      ],
      projectBullets: [
        {
          text: "Built a RAG-based AI assistant using LangChain and FAISS.",
          citedFactIds: ["fact-buildbusiness-rag"],
        },
      ],
    },
    {
      targetRole: "Spring Boot Backend Engineer",
      skills: ["Spring Boot", "Spring AOP", "PostgreSQL", "MySQL", "REST APIs"],
      headline: "Backend Engineer | Spring Boot • PostgreSQL • REST APIs",
      experienceBullets: [
        {
          text: "Built a year-level data freeze mechanism preventing CUD operations across examination data after prize-giving cycles using custom annotations and Spring AOP.",
          citedFactIds: ["fact-calsda-data-freeze"],
        },
      ],
      projectBullets: [
        {
          text: "Built backend-synced state management with offline entitlement caching, SMS OTP verification, and transactional emails on NestJS.",
          citedFactIds: ["fact-bns-offline-entitlements"],
        },
      ],
    },
    {
      targetRole: "Full-Stack Software Engineer",
      skills: ["React", "Spring Boot", "Next.js", "MySQL", "REST APIs"],
      headline: "Full-Stack Software Engineer | React • Spring Boot • Cloud",
      experienceBullets: [
        {
          text: "Eliminated filter-based API request race conditions using AbortController with useEffect cleanup so stale responses no longer overwrite the UI.",
          citedFactIds: ["fact-calsda-race-conditions"],
        },
      ],
      projectBullets: [
        {
          text: "Built automated marketing capabilities including personalized business websites, social media ad generation, and automated email campaigns.",
          citedFactIds: ["fact-buildbusiness-marketing-automation"],
        },
      ],
    },
    {
      targetRole: "Flutter Mobile Developer",
      skills: ["Flutter", "StoreKit (In-App Purchases)", "Google Play Billing", "REST APIs"],
      headline: "Mobile Engineer | Flutter • In-App Subscriptions • Mobile",
      experienceBullets: [
        {
          text: "Eliminated filter-based API request race conditions using AbortController with useEffect cleanup so stale responses no longer overwrite the UI.",
          citedFactIds: ["fact-calsda-race-conditions"],
        },
      ],
      projectBullets: [
        {
          text: "Implemented platform-conditional Sign in with Apple and Google with JWT-secured APIs and sandbox testing in App Store Connect.",
          citedFactIds: ["fact-bns-auth-oauth"],
        },
      ],
    },
    {
      targetRole: "AI Application Engineer",
      skills: ["FastAPI", "React", "Next.js", "REST APIs", "Retrieval-Augmented Generation (RAG)"],
      headline: "AI Application Engineer | LangChain • RAG • Vector Embeddings",
      experienceBullets: [
        {
          text: "Built a year-level data freeze mechanism preventing CUD operations across examination data after prize-giving cycles using custom annotations and Spring AOP.",
          citedFactIds: ["fact-calsda-data-freeze"],
        },
      ],
      projectBullets: [
        {
          text: "Built a RAG-based AI assistant and ML feasibility recommender using LangChain, FAISS, HuggingFace embeddings, and Groq LLM supporting English and Sinhala guidance.",
          citedFactIds: ["fact-buildbusiness-rag"],
        },
      ],
    },
  ];

  for (const target of profilesToTest) {
    it(`generates valid ATS HTML and binary PDF for ${target.targetRole}`, async () => {
      const cvSchema: TailoredCVSchema = {
        headline: target.headline,
        summary: `Software engineer specialized in ${target.targetRole} development with proven production experience.`,
        highlightSkills: target.skills,
        experiences: [
          {
            company: "Mobios Private Limited",
            role: "Associate Software Engineer",
            startDate: "2024-02",
            endDate: null,
            bullets: target.experienceBullets,
          },
        ],
        projects: [
          {
            name: "BuildBusinessLK",
            technologies: target.skills.slice(0, 3),
            bullets: target.projectBullets,
          },
        ],
        unsupportedRequirements: [],
      };

      // 1. Must pass zero-hallucination verification
      const verifyResult = CVTruthVerifier.verify(cvSchema, verifiedProfile);
      expect(verifyResult.isValid).toBe(true);

      // 2. Validate semantic HTML structure
      const html = generateATSSemanticHTML(cvSchema, verifiedProfile);
      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain("Havindu Hesara");
      expect(html).toContain("Mobios Private Limited");
      expect(html).toContain("2024-02 — Present");
      expect(html).toContain("PROFESSIONAL EXPERIENCE");
      expect(html).toContain("TECHNICAL SKILLS");
      expect(html).toContain("EDUCATION");
      expect(html).toContain(target.headline);

      // 3. Render vector PDF via Playwright
      const pdfBuffer = await PDFGenerator.generateCVPdf(cvSchema, verifiedProfile);
      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(3000); // Realistic vector PDF size
      expect(pdfBuffer.toString("ascii", 0, 5)).toBe("%PDF-");
    }, 20000);
  }
});
