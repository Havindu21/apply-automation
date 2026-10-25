import { db, pool } from "./index";
import {
  profiles,
  skills,
  facts,
  experiences,
  experienceFacts,
  projects,
  projectFacts,
  educations,
  careerProfiles,
  userPreferences,
} from "./schema";
import { initialImportedCVProfile } from "../lib/cv/initial-cv-data";

export async function seedDatabase() {
  console.log("Seeding database with Havindu's CV profile (unverified initial import)...");
  
  try {
    // Clear old profile-related seed records to guarantee clean state
    await db.delete(experienceFacts);
    await db.delete(projectFacts);
    await db.delete(facts);
    await db.delete(experiences);
    await db.delete(projects);
    await db.delete(skills);
    await db.delete(educations);
    await db.delete(careerProfiles);
    await db.delete(userPreferences);

    // 1. Upsert Profile
    await db.insert(profiles).values({
      id: initialImportedCVProfile.id,
      fullName: initialImportedCVProfile.fullName,
      email: initialImportedCVProfile.email,
      phone: initialImportedCVProfile.phone,
      location: initialImportedCVProfile.location,
      headline: initialImportedCVProfile.headline,
      summary: initialImportedCVProfile.summary,
      githubUrl: initialImportedCVProfile.githubUrl,
      linkedinUrl: initialImportedCVProfile.linkedinUrl,
    }).onConflictDoUpdate({
      target: profiles.id,
      set: {
        fullName: initialImportedCVProfile.fullName,
        email: initialImportedCVProfile.email,
        phone: initialImportedCVProfile.phone,
        location: initialImportedCVProfile.location,
        headline: initialImportedCVProfile.headline,
        summary: initialImportedCVProfile.summary,
        githubUrl: initialImportedCVProfile.githubUrl,
        linkedinUrl: initialImportedCVProfile.linkedinUrl,
        updatedAt: new Date(),
      },
    });

    // 2. Upsert Skills
    for (const skill of initialImportedCVProfile.skills) {
      await db.insert(skills).values({
        id: skill.id,
        name: skill.name,
        category: skill.category,
      }).onConflictDoNothing({ target: skills.id });
    }

    // 3. Upsert Experiences & Facts
    for (const exp of initialImportedCVProfile.experiences) {
      await db.insert(experiences).values({
        id: exp.id,
        profileId: initialImportedCVProfile.id,
        company: exp.company,
        role: exp.role,
        location: exp.location,
        startDate: exp.startDate,
        endDate: exp.endDate,
        isCurrent: exp.isCurrent,
      }).onConflictDoNothing({ target: experiences.id });

      let order = 1;
      for (const fact of exp.facts) {
        await db.insert(facts).values({
          id: fact.id,
          profileId: initialImportedCVProfile.id,
          text: fact.text,
          skillIds: fact.skillIds,
          evidence: fact.evidence,
          source: fact.source,
          isVerified: fact.isVerified, // remains false until explicitly verified
          version: fact.version,
        }).onConflictDoNothing({ target: facts.id });

        await db.insert(experienceFacts).values({
          id: `ef-${exp.id}-${fact.id}`,
          experienceId: exp.id,
          factId: fact.id,
          displayOrder: order++,
        }).onConflictDoNothing({ target: experienceFacts.id });
      }
    }

    // 4. Upsert Projects & Facts
    for (const proj of initialImportedCVProfile.projects) {
      await db.insert(projects).values({
        id: proj.id,
        profileId: initialImportedCVProfile.id,
        name: proj.name,
        role: proj.role,
        description: proj.description,
        technologies: proj.technologies,
        startDate: proj.startDate,
        endDate: proj.endDate,
      }).onConflictDoNothing({ target: projects.id });

      let order = 1;
      for (const fact of proj.facts) {
        await db.insert(facts).values({
          id: fact.id,
          profileId: initialImportedCVProfile.id,
          text: fact.text,
          skillIds: fact.skillIds,
          evidence: fact.evidence,
          source: fact.source,
          isVerified: fact.isVerified,
          version: fact.version,
        }).onConflictDoNothing({ target: facts.id });

        await db.insert(projectFacts).values({
          id: `pf-${proj.id}-${fact.id}`,
          projectId: proj.id,
          factId: fact.id,
          displayOrder: order++,
        }).onConflictDoNothing({ target: projectFacts.id });
      }
    }

    // 5. Upsert Educations
    for (const edu of initialImportedCVProfile.educations) {
      await db.insert(educations).values({
        id: edu.id,
        profileId: initialImportedCVProfile.id,
        institution: edu.institution,
        degree: edu.degree,
        startDate: edu.startDate,
        endDate: edu.endDate,
        isCurrent: edu.isCurrent,
        grade: edu.grade,
      }).onConflictDoNothing({ target: educations.id });
    }

    // 6. Upsert Career Profiles
    for (const cp of initialImportedCVProfile.careerProfiles) {
      await db.insert(careerProfiles).values({
        id: cp.id,
        profileId: initialImportedCVProfile.id,
        title: cp.title,
        priority: cp.priority,
        isEnabled: cp.isEnabled,
        targetTitles: cp.targetTitles,
        highlightSkillIds: cp.highlightSkillIds,
        summaryHeadline: cp.summaryHeadline,
      }).onConflictDoNothing({ target: careerProfiles.id });
    }

    // 7. Upsert User Preferences
    const pref = initialImportedCVProfile.preferences;
    await db.insert(userPreferences).values({
      id: `pref-${initialImportedCVProfile.id}`,
      profileId: initialImportedCVProfile.id,
      workModes: pref.workModes,
      allowSriLankaRemoteOnly: pref.allowSriLankaRemoteOnly,
      targetLocations: pref.targetLocations,
      targetTitles: pref.targetTitles,
      excludedCompanies: pref.excludedCompanies,
      excludedTechnologies: pref.excludedTechnologies,
      minSalary: pref.minSalary,
      salaryCurrency: pref.salaryCurrency,
      maxJobAgeDays: pref.maxJobAgeDays,
      minMatchScore: pref.minMatchScore,
      maxApplicationsPerDay: pref.maxApplicationsPerDay,
      automationEnabled: pref.automationEnabled,
      automationCron: pref.automationCron,
    }).onConflictDoNothing({ target: userPreferences.id });

    console.log("Database seeded successfully.");
  } catch (error) {
    console.error("Seeding error:", error);
    throw error;
  }
}

if (process.argv[1]?.endsWith("seed.ts")) {
  seedDatabase()
    .then(() => pool.end())
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
