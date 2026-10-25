import { describe, it, expect } from "vitest";
import { JobMatcher } from "../matcher";
import { initialImportedCVProfile } from "../../cv/initial-cv-data";
import { NormalizedJob } from "../../discovery/types";

describe("JobMatcher (Two-Tier Matching Engine)", () => {
  const profile = initialImportedCVProfile;

  const sampleRemoteJob: NormalizedJob = {
    source: "remotive",
    sourceId: "job-101",
    url: "https://remotive.com/job/101",
    urlHash: "hash-101",
    dedupeKey: "techcorp::react engineer::remote",
    title: "React Frontend Engineer",
    company: "TechCorp Global",
    location: "Worldwide",
    workMode: "remote",
    isWorldwideRemote: true,
    allowedLocations: ["Worldwide"],
    description: "Looking for an engineer experienced in React, Next.js, and state management.",
    discoveredAt: new Date(),
    eligibility: {
      isEligibleForSriLanka: true,
      isWorldwideRemote: true,
      detectedRegion: "Worldwide",
      reason: "Open worldwide",
      negativeFlagsFound: [],
      positiveFlagsFound: ["Worldwide Remote"],
    },
    status: "discovered",
  };

  it("tier 1: rejects jobs failing geographic eligibility immediately", async () => {
    const usOnlyJob: NormalizedJob = {
      ...sampleRemoteJob,
      urlHash: "hash-us-only",
      location: "United States",
      eligibility: {
        isEligibleForSriLanka: false,
        isWorldwideRemote: false,
        detectedRegion: "United States",
        reason: "Explicitly restricted to United States",
        negativeFlagsFound: ["Must reside in US"],
        positiveFlagsFound: [],
      },
    };

    const evaluation = await JobMatcher.evaluateJob(usOnlyJob, profile);
    expect(evaluation.eligible).toBe(false);
    expect(evaluation.matchScore).toBe(0);
    expect(evaluation.explanation).toContain("geographic eligibility");
  });

  it("tier 1: rejects jobs with incompatible work mode (onsite)", async () => {
    const onsiteJob: NormalizedJob = {
      ...sampleRemoteJob,
      urlHash: "hash-onsite",
      workMode: "onsite",
    };

    const evaluation = await JobMatcher.evaluateJob(onsiteJob, profile);
    expect(evaluation.eligible).toBe(false);
    expect(evaluation.matchScore).toBe(0);
    expect(evaluation.explanation).toContain("settings do not permit onsite");
  });

  it("tier 1: rejects jobs from excluded companies", async () => {
    const profileWithExclusion = structuredClone(profile);
    profileWithExclusion.preferences.excludedCompanies = ["TechCorp Global"];

    const evaluation = await JobMatcher.evaluateJob(sampleRemoteJob, profileWithExclusion);
    expect(evaluation.eligible).toBe(false);
    expect(evaluation.matchScore).toBe(0);
    expect(evaluation.explanation).toContain("excluded companies list");
  });

  it("tier 2: assigns proper career profile for React Frontend role", async () => {
    const evaluation = await JobMatcher.evaluateJob(sampleRemoteJob, profile);
    expect(evaluation.eligible).toBe(true);
    expect(evaluation.matchScore).toBeGreaterThanOrEqual(50);
    expect(evaluation.careerProfileTitle).toContain("Frontend");
  });

  it("tier 2: assigns Flutter career profile for Mobile Developer role", async () => {
    const flutterJob: NormalizedJob = {
      ...sampleRemoteJob,
      urlHash: "hash-flutter",
      title: "Flutter Mobile Developer",
      description: "Build iOS and Android mobile applications using Flutter and in-app subscriptions.",
    };

    const evaluation = await JobMatcher.evaluateJob(flutterJob, profile);
    expect(evaluation.careerProfileTitle).toContain("Flutter");
  });

  it("tier 2: assigns Backend career profile for Spring Boot role", async () => {
    const springJob: NormalizedJob = {
      ...sampleRemoteJob,
      urlHash: "hash-spring",
      title: "Java Spring Boot Backend Engineer",
      description: "Develop enterprise Spring Boot microservices with PostgreSQL and REST APIs.",
    };

    const evaluation = await JobMatcher.evaluateJob(springJob, profile);
    expect(evaluation.careerProfileTitle).toContain("Backend");
  });
});
