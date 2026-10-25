import { db, pool } from "@/db";
import {
  profiles,
  facts,
  userPreferences,
  careerProfiles,
  experiences,
  projects,
  skills,
  experienceFacts,
  projectFacts,
} from "@/db/schema";
import { initialImportedCVProfile } from "../cv/initial-cv-data";
import { FullProfile, UserPreferences, AtomicFact, Skill } from "../validation/profile";
import { eq } from "drizzle-orm";

// In-memory fallback store to ensure web application works even if Postgres Docker is starting or offline
const inMemoryProfile: FullProfile = JSON.parse(JSON.stringify(initialImportedCVProfile));

export class ProfileService {
  static async isDbAvailable(): Promise<boolean> {
    try {
      const client = await pool.connect();
      client.release();
      return true;
    } catch {
      return false;
    }
  }

  static async getProfile(): Promise<FullProfile> {
    const dbUp = await this.isDbAvailable();
    if (!dbUp) {
      if (process.env.NODE_ENV === "production" || process.env.STRICT_DB === "true") {
        throw new Error("Database unavailable: Production environment strictly prohibits silent in-memory fallback.");
      }
      return inMemoryProfile;
    }

    try {
      const profileRow = await db.query.profiles.findFirst({
        where: eq(profiles.id, inMemoryProfile.id),
      });

      if (!profileRow) {
        return inMemoryProfile;
      }

      // Fetch related records from DB
      const dbSkills = await db.select().from(skills);
      const dbFacts = await db.select().from(facts).where(eq(facts.profileId, profileRow.id));
      const dbExps = await db.select().from(experiences).where(eq(experiences.profileId, profileRow.id));
      const dbProjects = await db.select().from(projects).where(eq(projects.profileId, profileRow.id));
      const dbExpFacts = await db.select().from(experienceFacts);
      const dbProjFacts = await db.select().from(projectFacts);
      const dbCareerProfiles = await db.select().from(careerProfiles).where(eq(careerProfiles.profileId, profileRow.id));
      const dbPreferences = await db.query.userPreferences.findFirst({
        where: eq(userPreferences.profileId, profileRow.id),
      });

      return {
        id: profileRow.id,
        fullName: profileRow.fullName,
        email: profileRow.email,
        phone: profileRow.phone || undefined,
        location: profileRow.location || undefined,
        headline: profileRow.headline || undefined,
        summary: profileRow.summary || undefined,
        githubUrl: profileRow.githubUrl || undefined,
        linkedinUrl: profileRow.linkedinUrl || undefined,
        skills: dbSkills.map((s) => ({
          id: s.id,
          name: s.name,
          category: s.category as Skill["category"],
        })),
        experiences: dbExps.map((e) => {
          const linkedFactIds = new Set(
            dbExpFacts.filter((ef) => ef.experienceId === e.id).map((ef) => ef.factId)
          );
          return {
            id: e.id,
            company: e.company,
            role: e.role,
            location: e.location || undefined,
            startDate: e.startDate,
            endDate: e.endDate,
            isCurrent: e.isCurrent,
            facts: dbFacts
              .filter((f) => linkedFactIds.has(f.id))
              .map((f) => ({
                id: f.id,
                text: f.text,
                skillIds: f.skillIds,
                evidence: f.evidence || undefined,
                source: f.source as AtomicFact["source"],
                isVerified: f.isVerified,
                version: f.version,
              })),
          };
        }),
        projects: dbProjects.map((p) => {
          const linkedFactIds = new Set(
            dbProjFacts.filter((pf) => pf.projectId === p.id).map((pf) => pf.factId)
          );
          return {
            id: p.id,
            name: p.name,
            role: p.role || undefined,
            description: p.description || undefined,
            liveUrl: p.liveUrl || undefined,
            repoUrl: p.repoUrl || undefined,
            technologies: p.technologies,
            startDate: p.startDate || undefined,
            endDate: p.endDate || undefined,
            facts: dbFacts
              .filter((f) => linkedFactIds.has(f.id))
              .map((f) => ({
                id: f.id,
                text: f.text,
                skillIds: f.skillIds,
                evidence: f.evidence || undefined,
                source: f.source as AtomicFact["source"],
                isVerified: f.isVerified,
                version: f.version,
              })),
          };
        }),
        educations: inMemoryProfile.educations,
        careerProfiles: dbCareerProfiles.map((cp) => ({
          id: cp.id,
          title: cp.title,
          priority: cp.priority,
          isEnabled: cp.isEnabled,
          targetTitles: cp.targetTitles,
          highlightSkillIds: cp.highlightSkillIds,
          summaryHeadline: cp.summaryHeadline || undefined,
        })),
        preferences: dbPreferences
          ? {
              workModes: dbPreferences.workModes,
              allowSriLankaRemoteOnly: dbPreferences.allowSriLankaRemoteOnly,
              targetLocations: dbPreferences.targetLocations,
              targetTitles: dbPreferences.targetTitles,
              excludedCompanies: dbPreferences.excludedCompanies,
              excludedTechnologies: dbPreferences.excludedTechnologies,
              minSalary: dbPreferences.minSalary || undefined,
              salaryCurrency: dbPreferences.salaryCurrency,
              maxJobAgeDays: dbPreferences.maxJobAgeDays,
              minMatchScore: dbPreferences.minMatchScore,
              maxApplicationsPerDay: dbPreferences.maxApplicationsPerDay,
              automationEnabled: dbPreferences.automationEnabled,
              automationCron: dbPreferences.automationCron,
            }
          : inMemoryProfile.preferences,
      };
    } catch {
      return inMemoryProfile;
    }
  }

  static async verifyFact(factId: string, isVerified: boolean): Promise<boolean> {
    const dbUp = await this.isDbAvailable();
    if (!dbUp && (process.env.NODE_ENV === "production" || process.env.STRICT_DB === "true")) {
      throw new Error("Database unavailable: Production environment strictly prohibits silent in-memory updates.");
    }

    // Update in memory
    for (const exp of inMemoryProfile.experiences) {
      const target = exp.facts.find((f) => f.id === factId);
      if (target) {
        target.isVerified = isVerified;
        target.version += 1;
      }
    }
    for (const proj of inMemoryProfile.projects) {
      const target = proj.facts.find((f) => f.id === factId);
      if (target) {
        target.isVerified = isVerified;
        target.version += 1;
      }
    }

    // Update in database if connected
    if (dbUp) {
      try {
        await db.update(facts).set({
          isVerified,
          updatedAt: new Date(),
        }).where(eq(facts.id, factId));
      } catch (err) {
        console.error("Failed to update fact in DB:", err);
        if (process.env.NODE_ENV === "production" || process.env.STRICT_DB === "true") throw err;
      }
    }

    return true;
  }

  static async verifyAllFacts(): Promise<number> {
    const dbUp = await this.isDbAvailable();
    if (!dbUp && (process.env.NODE_ENV === "production" || process.env.STRICT_DB === "true")) {
      throw new Error("Database unavailable: Production environment strictly prohibits silent in-memory updates.");
    }

    let count = 0;
    for (const exp of inMemoryProfile.experiences) {
      for (const fact of exp.facts) {
        fact.isVerified = true;
        count++;
      }
    }
    for (const proj of inMemoryProfile.projects) {
      for (const fact of proj.facts) {
        fact.isVerified = true;
        count++;
      }
    }

    if (dbUp) {
      try {
        await db.update(facts).set({
          isVerified: true,
          updatedAt: new Date(),
        });
      } catch (err) {
        console.error("Failed to verify all facts in DB:", err);
        if (process.env.NODE_ENV === "production" || process.env.STRICT_DB === "true") throw err;
      }
    }

    return count;
  }

  static async updateFact(factId: string, updates: Partial<AtomicFact>): Promise<boolean> {
    for (const exp of inMemoryProfile.experiences) {
      const f = exp.facts.find((item) => item.id === factId);
      if (f) {
        Object.assign(f, updates, { version: f.version + 1 });
      }
    }
    for (const proj of inMemoryProfile.projects) {
      const f = proj.facts.find((item) => item.id === factId);
      if (f) {
        Object.assign(f, updates, { version: f.version + 1 });
      }
    }

    if (await this.isDbAvailable()) {
      try {
        await db.update(facts).set({
          ...(updates.text ? { text: updates.text } : {}),
          ...(updates.skillIds ? { skillIds: updates.skillIds } : {}),
          ...(updates.evidence ? { evidence: updates.evidence } : {}),
          updatedAt: new Date(),
        }).where(eq(facts.id, factId));
      } catch (err) {
        console.error("Failed to update fact in DB:", err);
      }
    }

    return true;
  }

  static async updatePreferences(updates: Partial<UserPreferences>): Promise<UserPreferences> {
    inMemoryProfile.preferences = {
      ...inMemoryProfile.preferences,
      ...updates,
    };

    if (await this.isDbAvailable()) {
      try {
        await db.update(userPreferences).set({
          ...(updates.workModes ? { workModes: updates.workModes } : {}),
          ...(updates.allowSriLankaRemoteOnly !== undefined ? { allowSriLankaRemoteOnly: updates.allowSriLankaRemoteOnly } : {}),
          ...(updates.targetLocations ? { targetLocations: updates.targetLocations } : {}),
          ...(updates.targetTitles ? { targetTitles: updates.targetTitles } : {}),
          ...(updates.minSalary !== undefined ? { minSalary: updates.minSalary } : {}),
          ...(updates.automationEnabled !== undefined ? { automationEnabled: updates.automationEnabled } : {}),
          ...(updates.automationCron ? { automationCron: updates.automationCron } : {}),
          updatedAt: new Date(),
        }).where(eq(userPreferences.profileId, inMemoryProfile.id));
      } catch (err) {
        console.error("Failed to update preferences in DB:", err);
      }
    }

    return inMemoryProfile.preferences;
  }

  static async toggleCareerProfile(id: string, isEnabled: boolean): Promise<boolean> {
    const cp = inMemoryProfile.careerProfiles.find((item) => item.id === id);
    if (cp) {
      cp.isEnabled = isEnabled;
    }

    if (await this.isDbAvailable()) {
      try {
        await db.update(careerProfiles).set({
          isEnabled,
          updatedAt: new Date(),
        }).where(eq(careerProfiles.id, id));
      } catch (err) {
        console.error("Failed to update career profile in DB:", err);
      }
    }

    return true;
  }
}
