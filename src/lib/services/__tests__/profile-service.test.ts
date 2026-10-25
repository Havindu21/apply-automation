import { describe, it, expect, beforeAll } from "vitest";
import { ProfileService } from "../profile-service";

describe("ProfileService Unit Tests", () => {
  beforeAll(async () => {
    // Ensure test isolation by un-verifying sample fact
    await ProfileService.verifyFact("fact-calsda-data-freeze", false);
  });

  it("retrieves the profile with initial unverified facts", async () => {
    const profile = await ProfileService.getProfile();
    expect(profile.fullName).toBe("Havindu Hesara");
    expect(profile.experiences.length).toBeGreaterThan(0);
    // Facts start unverified
    const allFacts = profile.experiences.flatMap((e) => e.facts);
    expect(allFacts.some((f) => f.isVerified === false)).toBe(true);
  });

  it("verifies an individual fact by ID", async () => {
    const factId = "fact-calsda-data-freeze";
    await ProfileService.verifyFact(factId, true);
    const profile = await ProfileService.getProfile();
    const fact = profile.experiences.flatMap((e) => e.facts).find((f) => f.id === factId);
    expect(fact?.isVerified).toBe(true);
  });

  it("updates preferences and toggles work-mode settings", async () => {
    await ProfileService.updatePreferences({
      workModes: { remote: true, hybrid: true, onsite: false },
      minSalary: 2000,
    });
    const profile = await ProfileService.getProfile();
    expect(profile.preferences.workModes.hybrid).toBe(true);
    expect(profile.preferences.minSalary).toBe(2000);
  });

  it("toggles a career profile enabled state", async () => {
    const cpId = "cp-flutter";
    await ProfileService.toggleCareerProfile(cpId, false);
    const profile = await ProfileService.getProfile();
    const cp = profile.careerProfiles.find((p) => p.id === cpId);
    expect(cp?.isEnabled).toBe(false);
  });

  it("verifies all facts in batch", async () => {
    const verifiedCount = await ProfileService.verifyAllFacts();
    expect(verifiedCount).toBeGreaterThan(0);
    const profile = await ProfileService.getProfile();
    const allFacts = [
      ...profile.experiences.flatMap((e) => e.facts),
      ...profile.projects.flatMap((p) => p.facts),
    ];
    expect(allFacts.every((f) => f.isVerified === true)).toBe(true);
  });
});
