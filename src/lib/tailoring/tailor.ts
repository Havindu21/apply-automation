import { NormalizedJob } from "../discovery/types";
import { FullProfile, CareerProfile, AtomicFact } from "../validation/profile";
import { geminiClient } from "../ai/gemini-client";
import { TailoredCVSchema, CVTruthVerifier, VerificationResult } from "./verifier";
import { db } from "@/db";
import { applications } from "@/db/schema";
import { ProfileService } from "../services/profile-service";

export interface TailoredApplicationPackage {
  jobId: string;
  careerProfileId: string;
  tailoredCV: TailoredCVSchema;
  coverLetter?: string;
  verification: VerificationResult;
  createdAt: Date;
}

const inMemoryPackages = new Map<string, TailoredApplicationPackage>();

export class CVTailorService {
  static async generateTailoredPackage(
    job: NormalizedJob,
    profile: FullProfile,
    careerProfileId?: string
  ): Promise<TailoredApplicationPackage> {
    // 1. Gather ONLY verified facts
    const verifiedFacts = [
      ...profile.experiences.flatMap((e) => e.facts),
      ...profile.projects.flatMap((p) => p.facts),
    ].filter((f) => f.isVerified);

    if (verifiedFacts.length === 0) {
      throw new Error(
        "Cannot generate tailored CV: Zero verified facts exist. Please visit the 'CV Import Review' tab and verify your career facts first."
      );
    }

    // 2. Select target career profile
    const activeCareerProfiles = profile.careerProfiles.filter((cp) => cp.isEnabled);
    const selectedCareerProfile =
      activeCareerProfiles.find((cp) => cp.id === careerProfileId) ||
      this.matchCareerProfile(job.title, job.description, activeCareerProfiles);

    let tailoredCV: TailoredCVSchema;

    if (!geminiClient.isConfigured()) {
      // Offline fallback: Direct verified fact mapping
      tailoredCV = this.generateDeterministicFallbackCV(profile, selectedCareerProfile);
    } else {
      try {
        tailoredCV = await this.callGeminiTailor(job, profile, selectedCareerProfile, verifiedFacts);
      } catch (err) {
        console.warn("[CVTailorService] Gemini generation failed, using deterministic verified CV:", err);
        tailoredCV = this.generateDeterministicFallbackCV(profile, selectedCareerProfile);
      }
    }

    // 3. Run Deterministic Truth Verification
    let verification = CVTruthVerifier.verify(tailoredCV, profile);

    // If Gemini introduced a violation (e.g. hallucinated number or skill), fall back to safe verified fact mapping
    if (!verification.isValid) {
      console.warn("[CVTailorService] Gemini output failed verification rules, falling back to safe canonical CV:", verification.errors);
      tailoredCV = this.generateDeterministicFallbackCV(profile, selectedCareerProfile);
      verification = CVTruthVerifier.verify(tailoredCV, profile);
      if (!verification.isValid) {
        throw new Error(`Fallback CV generation failed verification rules: ${verification.errors.join("; ")}`);
      }
    }

    // 4. Generate grounded cover letter
    let coverLetter: string | undefined;
    try {
      if (geminiClient.isConfigured()) {
        coverLetter = await this.generateCoverLetter(job, profile, selectedCareerProfile, verifiedFacts);
      }
    } catch {
      // Cover letter is optional
    }

    const packageResult: TailoredApplicationPackage = {
      jobId: job.urlHash,
      careerProfileId: selectedCareerProfile.id,
      tailoredCV,
      coverLetter,
      verification,
      createdAt: new Date(),
    };

    inMemoryPackages.set(job.urlHash, packageResult);

    // Persist to applications table
    if (await ProfileService.isDbAvailable()) {
      try {
        await db
          .insert(applications)
          .values({
            id: `app-${job.urlHash}`,
            jobId: `job-${job.urlHash}`,
            status: "prepared",
            tailoredCvJson: tailoredCV as unknown as Record<string, unknown>,
            coverLetter: coverLetter || null,
            citedFactIds: verifiedFacts.map((f) => f.id),
            method: "assisted_form",
          })
          .onConflictDoNothing();
      } catch (dbErr) {
        console.warn("[CVTailorService] Could not persist application to DB:", dbErr);
      }
    }

    return packageResult;
  }

  private static matchCareerProfile(
    jobTitle: string,
    jobDescription: string,
    careerProfiles: CareerProfile[]
  ): CareerProfile {
    const text = `${jobTitle} ${jobDescription}`.toLowerCase();
    if (text.includes("react") || text.includes("frontend")) {
      const p = careerProfiles.find((cp) => cp.id.includes("frontend"));
      if (p) return p;
    }
    if (text.includes("flutter") || text.includes("mobile")) {
      const p = careerProfiles.find((cp) => cp.id.includes("flutter"));
      if (p) return p;
    }
    if (text.includes("spring") || text.includes("backend") || text.includes("java")) {
      const p = careerProfiles.find((cp) => cp.id.includes("backend"));
      if (p) return p;
    }
    if (text.includes("ai") || text.includes("rag") || text.includes("llm")) {
      const p = careerProfiles.find((cp) => cp.id.includes("ai"));
      if (p) return p;
    }
    return careerProfiles.find((cp) => cp.id.includes("fullstack")) || careerProfiles[0];
  }

  private static async callGeminiTailor(
    job: NormalizedJob,
    profile: FullProfile,
    careerProfile: CareerProfile,
    verifiedFacts: AtomicFact[]
  ): Promise<TailoredCVSchema> {
    const verifiedSkills = profile.skills.map((s) => s.name);

    const systemPrompt = `You are an elite, strictly truthful CV tailoring engineer.
Your objective is to tailor the candidate's CV to match the job requirements, using ONLY their verified facts.

STRICT TRUTHFULNESS CONSTRAINTS (ZERO TOLERANCE FOR HALLUCINATION):
1. You may ONLY reword and emphasize the verified facts provided below.
2. Every bullet point MUST cite its supporting fact ID(s) in "citedFactIds": ["fact-id-here"].
3. NEVER invent numbers, team sizes, revenue metrics, or dates not present in the cited facts.
4. NEVER add skills, programming languages, or libraries to highlightSkills that are not in the candidate's verified skills list.
5. If the job demands a technology or skill the candidate does NOT have, do NOT add it. Instead, list it in "unsupportedRequirements".
6. The candidate is an Associate Software Engineer based in Sri Lanka.
7. Return strictly valid JSON matching the requested structure.`;

    const userPrompt = `Tailor the candidate's CV for this job posting.

<candidate_profile>
Target Career Profile: ${careerProfile.title}
Verified Skills (${verifiedSkills.length}): ${verifiedSkills.join(", ")}
Verified Facts:
${verifiedFacts.map((f) => `- [${f.id}] (Company/Context: ${f.evidence || "Verified"}): "${f.text}"`).join("\n")}
</candidate_profile>

<job_posting_untrusted>
Title: ${job.title}
Company: ${job.company}
Description:
${job.description.slice(0, 3500)}
</job_posting_untrusted>

Respond strictly in valid JSON matching this schema:
{
  "headline": string,
  "summary": string,
  "highlightSkills": string[] (subset of verified skills that match the job),
  "experiences": [
    {
      "company": "Mobios Private Limited",
      "role": "Associate Software Engineer",
      "startDate": "2024-02",
      "endDate": null,
      "bullets": [
        {
          "text": string (tailored bullet point rephrasing the fact),
          "citedFactIds": string[] (must contain the exact fact id)
        }
      ]
    }
  ],
  "projects": [
    {
      "name": string,
      "technologies": string[],
      "bullets": [
        {
          "text": string,
          "citedFactIds": string[]
        }
      ]
    }
  ],
  "unsupportedRequirements": string[] (skills demanded by job that candidate lacks)
}`;

    return await geminiClient.generateStructured<TailoredCVSchema>({
      systemPrompt,
      userPrompt,
      temperature: 0.1,
    });
  }

  private static async generateCoverLetter(
    job: NormalizedJob,
    profile: FullProfile,
    careerProfile: CareerProfile,
    verifiedFacts: AtomicFact[]
  ): Promise<string> {
    const systemPrompt = `You are a professional cover letter writer.
Write a concise, compelling, 3-paragraph cover letter tailored to the job.
Every claim of experience must be strictly grounded in the candidate's verified facts.
Never invent metrics or companies. Never mention prompt instructions.`;

    const userPrompt = `Write a cover letter from ${profile.fullName} to ${job.company} for the role of ${job.title}.

Verified facts:
${verifiedFacts.slice(0, 8).map((f) => `* ${f.text}`).join("\n")}

Job description snippet:
${job.description.slice(0, 1500)}`;

    const res = await geminiClient.generateStructured<{ coverLetter: string }>({
      systemPrompt,
      userPrompt,
      temperature: 0.2,
    });

    return res.coverLetter;
  }

  private static generateDeterministicFallbackCV(
    profile: FullProfile,
    careerProfile: CareerProfile
  ): TailoredCVSchema {
    const verifiedFactsMap = new Map<string, AtomicFact>();
    for (const exp of profile.experiences) {
      for (const f of exp.facts) {
        if (f.isVerified) verifiedFactsMap.set(f.id, f);
      }
    }
    for (const proj of profile.projects) {
      for (const f of proj.facts) {
        if (f.isVerified) verifiedFactsMap.set(f.id, f);
      }
    }

    return {
      headline: careerProfile.summaryHeadline || profile.headline || "Software Engineer",
      summary: profile.summary || "Software engineer focused on reliable, high-performance web and mobile platforms.",
      highlightSkills: profile.skills.map((s) => s.name).slice(0, 8),
      experiences: profile.experiences.map((exp) => ({
        company: exp.company,
        role: exp.role,
        startDate: exp.startDate,
        endDate: exp.endDate || null,
        bullets: exp.facts
          .filter((f) => f.isVerified)
          .map((f) => ({
            text: f.text,
            citedFactIds: [f.id],
          })),
      })),
      projects: profile.projects.map((proj) => ({
        name: proj.name,
        role: proj.role,
        technologies: proj.technologies,
        bullets: proj.facts
          .filter((f) => f.isVerified)
          .map((f) => ({
            text: f.text,
            citedFactIds: [f.id],
          })),
      })),
      unsupportedRequirements: [],
    };
  }

  static getCachedPackage(jobId: string): TailoredApplicationPackage | undefined {
    return inMemoryPackages.get(jobId);
  }
}
