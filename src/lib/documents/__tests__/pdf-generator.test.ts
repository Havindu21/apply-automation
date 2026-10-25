import { describe, it, expect } from "vitest";
import { PDFGenerator } from "../pdf-generator";
import { initialImportedCVProfile } from "../../cv/initial-cv-data";
import { TailoredCVSchema } from "../../tailoring/verifier";
import { generateATSSemanticHTML, generateCoverLetterSemanticHTML } from "../ats-template";

describe("PDFGenerator & Semantic ATS Templates", () => {
  const sampleTailoredCV: TailoredCVSchema = {
    headline: "Frontend Engineer | React & TypeScript",
    summary: "Software engineer specialized in React, Next.js, and TypeScript frontend development.",
    highlightSkills: ["React", "TypeScript", "Next.js", "Tailwind CSS"],
    experiences: [
      {
        company: "Arimac Digital",
        role: "Associate Software Engineer",
        startDate: "2024-01",
        endDate: null,
        bullets: [
          {
            text: "Engineered scalable React frontend components with high responsiveness.",
            citedFactIds: ["exp1-bullet-1"],
          },
        ],
      },
    ],
    projects: [
      {
        name: "Enterprise Design System",
        role: "Lead Frontend Engineer",
        technologies: ["React", "TypeScript", "Tailwind CSS"],
        bullets: [
          {
            text: "Developed accessible reusable UI components with 100% test coverage.",
            citedFactIds: ["proj1-bullet-1"],
          },
        ],
      },
    ],
    unsupportedRequirements: [],
  };

  it("generates semantic ATS HTML with proper sections and escaping", () => {
    const html = generateATSSemanticHTML(sampleTailoredCV, initialImportedCVProfile);
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain(initialImportedCVProfile.fullName);
    expect(html).toContain("TECHNICAL SKILLS");
    expect(html).toContain("PROFESSIONAL EXPERIENCE");
    expect(html).toContain("Arimac Digital");
    expect(html).toContain("Enterprise Design System");
  });

  it("generates semantic cover letter HTML", () => {
    const coverText = "Dear Hiring Team,\n\nI am writing to express my strong interest in the Frontend Engineer role.";
    const html = generateCoverLetterSemanticHTML(coverText, initialImportedCVProfile, "Frontend Engineer", "Acme Corp");
    expect(html).toContain("Acme Corp");
    expect(html).toContain("Frontend Engineer");
    expect(html).toContain("I am writing to express my strong interest");
  });

  it("renders a binary PDF buffer from the tailored CV via Playwright", async () => {
    const buffer = await PDFGenerator.generateCVPdf(sampleTailoredCV, initialImportedCVProfile);
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(1000);
    // PDF magic bytes: %PDF-
    const header = buffer.toString("ascii", 0, 5);
    expect(header).toBe("%PDF-");
  }, 15000);
});
