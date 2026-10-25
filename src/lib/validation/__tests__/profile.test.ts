import { describe, it, expect } from "vitest";
import { FullProfileSchema, FullProfile } from "../profile";

const sampleValidProfile: FullProfile = {
  id: "profile-havindu",
  fullName: "Havindu Hesara",
  email: "havindufonseka@gmail.com",
  phone: "+94 70 278 3060",
  location: "Colombo 06, Sri Lanka",
  headline: "Associate Software Engineer | React • Spring Boot • MySQL • Flutter",
  summary: "Associate Software Engineer with strong experience in React, Spring Boot, and Flutter.",
  githubUrl: "https://github.com/Havindu21",
  linkedinUrl: "https://linkedin.com/in/havindu-hesara",
  skills: [
    { id: "react", name: "React", category: "frontend" },
    { id: "spring-boot", name: "Spring Boot", category: "backend" },
    { id: "mysql", name: "MySQL", category: "database" },
    { id: "flutter", name: "Flutter", category: "mobile" },
    { id: "performance", name: "Frontend Performance", category: "frontend" },
  ],
  experiences: [
    {
      id: "exp-mobios",
      company: "Mobios Private Limited",
      role: "Associate Software Engineer",
      location: "Colombo 06",
      startDate: "2025-09",
      endDate: null,
      isCurrent: true,
      facts: [
        {
          id: "fact-calsda-01",
          text: "Built a year-level data freeze mechanism using custom annotations and Spring AOP.",
          skillIds: ["spring-boot"],
          evidence: "CALSDA platform",
          source: "cv_import",
          isVerified: false,
          version: 1,
        },
      ],
    },
  ],
  projects: [
    {
      id: "proj-bns",
      name: "BNS World",
      role: "Mobile Developer",
      startDate: "2024-05",
      endDate: "2024-11",
      technologies: ["Flutter", "NestJS"],
      facts: [
        {
          id: "fact-bns-01",
          text: "Built a production in-app subscription system with Apple JWS verification.",
          skillIds: ["flutter"],
          source: "cv_import",
          isVerified: false,
          version: 1,
        },
      ],
    },
  ],
  educations: [
    {
      id: "edu-kelaniya",
      institution: "University of Kelaniya",
      degree: "BSc(Hons) in Computer Science",
      startDate: "2024-09",
      endDate: null,
      isCurrent: true,
    },
  ],
  careerProfiles: [
    {
      id: "cp-frontend",
      title: "Frontend Engineer",
      priority: 1,
      isEnabled: true,
      targetTitles: ["Frontend Engineer", "React Developer"],
      highlightSkillIds: ["react", "performance"],
      summaryHeadline: "React Frontend Engineer specialized in UI performance & state management",
    },
  ],
  preferences: {
    workModes: { remote: true, hybrid: false, onsite: false },
    allowSriLankaRemoteOnly: true,
    targetLocations: ["Sri Lanka", "Worldwide", "Remote"],
    targetTitles: ["Frontend Engineer", "Software Engineer"],
    excludedCompanies: [],
    excludedTechnologies: [],
    minSalary: 1500,
    salaryCurrency: "USD",
    maxJobAgeDays: 14,
    minMatchScore: 65,
    maxApplicationsPerDay: 5,
    automationEnabled: false,
    automationCron: "0 8 * * *",
  },
};

describe("Profile Schema Validation (Spec 001)", () => {
  it("criterion 1: valid profile passes successfully", () => {
    const result = FullProfileSchema.safeParse(sampleValidProfile);
    expect(result.success).toBe(true);
  });

  it("criterion 2: bad date format fails", () => {
    const invalidProfile = structuredClone(sampleValidProfile);
    // Invalid date format (not YYYY-MM)
    invalidProfile.experiences[0].startDate = "2025/09/01";

    const result = FullProfileSchema.safeParse(invalidProfile);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message.includes("YYYY-MM"))).toBe(true);
    }
  });

  it("criterion 3: end date before start date fails", () => {
    const invalidProfile = structuredClone(sampleValidProfile);
    invalidProfile.experiences[0].isCurrent = false;
    invalidProfile.experiences[0].startDate = "2025-09";
    invalidProfile.experiences[0].endDate = "2024-01"; // Before start date

    const result = FullProfileSchema.safeParse(invalidProfile);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message.includes("cannot be before startDate"))).toBe(true);
    }
  });

  it("criterion 4: all work modes off fails", () => {
    const invalidProfile = structuredClone(sampleValidProfile);
    invalidProfile.preferences.workModes = {
      remote: false,
      hybrid: false,
      onsite: false,
    };

    const result = FullProfileSchema.safeParse(invalidProfile);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message.includes("At least one work mode"))).toBe(true);
    }
  });

  it("criterion 5: fact referencing an unknown skill fails", () => {
    const invalidProfile = structuredClone(sampleValidProfile);
    // Reference a skill that doesn't exist in profile.skills
    invalidProfile.experiences[0].facts[0].skillIds = ["non-existent-skill"];

    const result = FullProfileSchema.safeParse(invalidProfile);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message.includes("references unknown skill"))).toBe(true);
    }
  });

  it("criterion 6: duplicate skill IDs within a fact fails", () => {
    const invalidProfile = structuredClone(sampleValidProfile);
    invalidProfile.experiences[0].facts[0].skillIds = ["spring-boot", "spring-boot"];

    const result = FullProfileSchema.safeParse(invalidProfile);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message.includes("Duplicate skill IDs"))).toBe(true);
    }
  });

  it("criterion 7: empty or over-300-character fact fails", () => {
    // Empty fact
    const emptyFactProfile = structuredClone(sampleValidProfile);
    emptyFactProfile.experiences[0].facts[0].text = "";
    expect(FullProfileSchema.safeParse(emptyFactProfile).success).toBe(false);

    // Over 300 char fact
    const longFactProfile = structuredClone(sampleValidProfile);
    longFactProfile.experiences[0].facts[0].text = "A".repeat(301);
    const longResult = FullProfileSchema.safeParse(longFactProfile);
    expect(longResult.success).toBe(false);
    if (!longResult.success) {
      expect(longResult.error.issues.some((i) => i.message.includes("cannot exceed 300 characters"))).toBe(true);
    }
  });

  it("criterion 8: experience with no facts fails", () => {
    const noFactsProfile = structuredClone(sampleValidProfile);
    noFactsProfile.experiences[0].facts = [];

    const result = FullProfileSchema.safeParse(noFactsProfile);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message.includes("at least one fact"))).toBe(true);
    }
  });
});
