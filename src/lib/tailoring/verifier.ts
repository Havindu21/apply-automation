import { FullProfile, AtomicFact } from "../validation/profile";

export interface TailoredBullet {
  text: string;
  citedFactIds: string[];
}

export interface TailoredExperienceSection {
  company: string;
  role: string;
  startDate: string;
  endDate: string | null;
  bullets: TailoredBullet[];
}

export interface TailoredProjectSection {
  name: string;
  role?: string;
  technologies: string[];
  bullets: TailoredBullet[];
}

export interface TailoredCVSchema {
  headline: string;
  summary: string;
  highlightSkills: string[];
  experiences: TailoredExperienceSection[];
  projects: TailoredProjectSection[];
  unsupportedRequirements: string[];
}

export interface VerificationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  verifiedFactCount: number;
}

export class CVTruthVerifier {
  static verify(
    tailoredCV: TailoredCVSchema,
    profile: FullProfile
  ): VerificationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Build map of verified facts
    const allProfileFacts = [
      ...profile.experiences.flatMap((e) => e.facts),
      ...profile.projects.flatMap((p) => p.facts),
    ];
    const verifiedFactsMap = new Map<string, AtomicFact>();
    for (const f of allProfileFacts) {
      if (f.isVerified) {
        verifiedFactsMap.set(f.id, f);
      }
    }

    // Known skills catalog
    const knownSkillNames = new Set(
      profile.skills.map((s) => s.name.toLowerCase().replace(/[^\w]/g, ""))
    );
    const knownSkillIds = new Set(profile.skills.map((s) => s.id.toLowerCase()));

    let totalCitations = 0;

    // 2. Verify Experience Bullets
    for (const exp of tailoredCV.experiences) {
      // Check employer exists in profile
      const matchingExp = profile.experiences.find(
        (e) => e.company.toLowerCase() === exp.company.toLowerCase()
      );
      if (!matchingExp) {
        errors.push(`Undeclared employer '${exp.company}' not found in candidate employment history.`);
      }

      for (let i = 0; i < exp.bullets.length; i++) {
        const bullet = exp.bullets[i];

        // Criterion A: Must cite at least one fact ID
        if (!bullet.citedFactIds || bullet.citedFactIds.length === 0) {
          errors.push(
            `Bullet in ${exp.company} (#${i + 1}) fails verification: Zero fact IDs cited. All claims must cite verified facts.`
          );
          continue;
        }

        // Criterion B: All cited fact IDs must exist and be verified
        const citedFacts: AtomicFact[] = [];
        for (const factId of bullet.citedFactIds) {
          totalCitations++;
          const fact = verifiedFactsMap.get(factId);
          if (!fact) {
            const isUnverified = allProfileFacts.find((f) => f.id === factId && !f.isVerified);
            if (isUnverified) {
              errors.push(
                `Fact '${factId}' cited in ${exp.company} is UNVERIFIED. Imported facts must be user-verified before use.`
              );
            } else {
              errors.push(
                `Fact ID '${factId}' cited in ${exp.company} does not exist in the candidate profile.`
              );
            }
          } else {
            citedFacts.push(fact);
          }
        }

        // Criterion C: Numeric metric hallucination check
        if (citedFacts.length > 0) {
          this.checkNumericHallucination(bullet.text, citedFacts, errors, `${exp.company} bullet #${i + 1}`);
        }
      }
    }

    // 3. Verify Project Bullets
    for (const proj of tailoredCV.projects) {
      for (let i = 0; i < proj.bullets.length; i++) {
        const bullet = proj.bullets[i];

        if (!bullet.citedFactIds || bullet.citedFactIds.length === 0) {
          errors.push(
            `Project '${proj.name}' bullet #${i + 1} fails verification: Zero fact IDs cited.`
          );
          continue;
        }

        const citedFacts: AtomicFact[] = [];
        for (const factId of bullet.citedFactIds) {
          totalCitations++;
          const fact = verifiedFactsMap.get(factId);
          if (!fact) {
            errors.push(`Project '${proj.name}' cites unverified or unknown fact ID '${factId}'.`);
          } else {
            citedFacts.push(fact);
          }
        }

        if (citedFacts.length > 0) {
          this.checkNumericHallucination(bullet.text, citedFacts, errors, `Project ${proj.name} bullet #${i + 1}`);
        }
      }
    }

    // 4. Verify Highlighted Skills
    for (const skill of tailoredCV.highlightSkills) {
      const cleanSkill = skill.toLowerCase().replace(/[^\w]/g, "");
      const isKnown = knownSkillNames.has(cleanSkill) || knownSkillIds.has(cleanSkill);

      if (!isKnown) {
        errors.push(
          `Hallucinated Skill Detected: '${skill}' is not among candidate's verified skills. System prohibits inserting unverified skills to pass ATS filters.`
        );
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      verifiedFactCount: totalCitations,
    };
  }

  private static checkNumericHallucination(
    bulletText: string,
    citedFacts: AtomicFact[],
    errors: string[],
    contextLabel: string
  ) {
    // Extract numbers, percentages, multipliers (e.g. "40%", "10x", "50", "2.5")
    const numberRegex = /\b\d+(?:\.\d+)?%?(?:x)?\b/gi;
    const bulletNumbers = bulletText.match(numberRegex) || [];

    const combinedSourceText = citedFacts.map((f) => f.text).join(" ");
    const sourceNumbers = new Set(combinedSourceText.match(numberRegex) || []);

    for (const num of bulletNumbers) {
      // Exclude simple grammatical years or single-digit bullet indices if not a metric
      if (num === "1" || num === "2" || num === "3") continue;

      if (!sourceNumbers.has(num)) {
        errors.push(
          `Metric Hallucination Guard: Number/Metric '${num}' found in ${contextLabel} is absent from supporting fact evidence (${combinedSourceText}).`
        );
      }
    }
  }
}
