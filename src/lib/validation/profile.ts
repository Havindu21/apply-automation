import { z } from "zod";

export const DateYearMonthRegex = /^\d{4}-(0[1-9]|1[0-2])$/;

export const SkillCategoryEnum = z.enum([
  "frontend",
  "backend",
  "mobile",
  "ai_ml",
  "database",
  "auth",
  "tools",
  "general",
]);

export const SkillSchema = z.object({
  id: z.string().min(1).regex(/^[a-z0-9-_]+$/, "Skill ID must be lowercase alphanumeric with hyphens or underscores"),
  name: z.string().min(1, "Skill name is required"),
  category: SkillCategoryEnum,
});

export const AtomicFactSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1, "Fact cannot be empty").max(300, "Fact cannot exceed 300 characters"),
  skillIds: z.array(z.string()).refine(
    (skills) => new Set(skills).size === skills.length,
    { message: "Duplicate skill IDs are not allowed in a fact" }
  ),
  evidence: z.string().optional(),
  source: z.enum(["cv_import", "manual", "repository"]).default("cv_import"),
  isVerified: z.boolean().default(false),
  version: z.number().int().positive().default(1),
});

export const ExperienceSchema = z.object({
  id: z.string().min(1),
  company: z.string().min(1, "Company is required"),
  role: z.string().min(1, "Role is required"),
  location: z.string().optional(),
  startDate: z.string().regex(DateYearMonthRegex, "startDate must be in YYYY-MM format"),
  endDate: z.string().regex(DateYearMonthRegex, "endDate must be in YYYY-MM format").nullable().optional(),
  isCurrent: z.boolean().default(false),
  facts: z.array(AtomicFactSchema).min(1, "Experience must have at least one fact"),
}).refine(
  (data) => {
    if (!data.endDate || data.isCurrent) return true;
    return data.endDate >= data.startDate;
  },
  {
    message: "endDate cannot be before startDate",
    path: ["endDate"],
  }
);

export const ProjectSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1, "Project name is required"),
  role: z.string().optional(),
  description: z.string().optional(),
  liveUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  repoUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  technologies: z.array(z.string()).default([]),
  startDate: z.string().regex(DateYearMonthRegex, "startDate must be in YYYY-MM format").optional(),
  endDate: z.string().regex(DateYearMonthRegex, "endDate must be in YYYY-MM format").optional(),
  facts: z.array(AtomicFactSchema).min(1, "Project must have at least one fact"),
}).refine(
  (data) => {
    if (!data.startDate || !data.endDate) return true;
    return data.endDate >= data.startDate;
  },
  {
    message: "endDate cannot be before startDate",
    path: ["endDate"],
  }
);

export const EducationSchema = z.object({
  id: z.string().min(1),
  institution: z.string().min(1, "Institution is required"),
  degree: z.string().min(1, "Degree is required"),
  startDate: z.string().regex(DateYearMonthRegex, "startDate must be in YYYY-MM format"),
  endDate: z.string().regex(DateYearMonthRegex, "endDate must be in YYYY-MM format").nullable().optional(),
  isCurrent: z.boolean().default(false),
  grade: z.string().optional(),
}).refine(
  (data) => {
    if (!data.endDate || data.isCurrent) return true;
    return data.endDate >= data.startDate;
  },
  {
    message: "endDate cannot be before startDate",
    path: ["endDate"],
  }
);

export const WorkModesSchema = z.object({
  remote: z.boolean(),
  hybrid: z.boolean(),
  onsite: z.boolean(),
}).refine(
  (modes) => modes.remote || modes.hybrid || modes.onsite,
  {
    message: "At least one work mode (remote, hybrid, or onsite) must be enabled",
  }
);

export const UserPreferencesSchema = z.object({
  workModes: WorkModesSchema,
  allowSriLankaRemoteOnly: z.boolean().default(true),
  targetLocations: z.array(z.string()).min(1, "At least one target location required"),
  targetTitles: z.array(z.string()).min(1, "At least one target title required"),
  excludedCompanies: z.array(z.string()).default([]),
  excludedTechnologies: z.array(z.string()).default([]),
  minSalary: z.number().int().positive().optional().nullable(),
  salaryCurrency: z.string().default("USD"),
  maxJobAgeDays: z.number().int().positive().default(14),
  minMatchScore: z.number().int().min(0).max(100).default(65),
  maxApplicationsPerDay: z.number().int().positive().default(5),
  automationEnabled: z.boolean().default(false),
  automationCron: z.string().default("0 8 * * *"),
});

export const CareerProfileSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1, "Title is required"),
  priority: z.number().int().min(1).default(1),
  isEnabled: z.boolean().default(true),
  targetTitles: z.array(z.string()).min(1, "At least one target title required"),
  highlightSkillIds: z.array(z.string()).default([]),
  summaryHeadline: z.string().optional(),
});

export const FullProfileSchema = z.object({
  id: z.string().min(1),
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email("Valid email required"),
  phone: z.string().optional(),
  location: z.string().optional(),
  headline: z.string().optional(),
  summary: z.string().optional(),
  githubUrl: z.string().optional(),
  linkedinUrl: z.string().optional(),
  skills: z.array(SkillSchema).min(1, "At least one skill is required"),
  experiences: z.array(ExperienceSchema).min(1, "At least one experience is required"),
  projects: z.array(ProjectSchema).default([]),
  educations: z.array(EducationSchema).min(1, "At least one education entry is required"),
  careerProfiles: z.array(CareerProfileSchema).default([]),
  preferences: UserPreferencesSchema,
}).superRefine((profile, ctx) => {
  // Cross-reference check: verify that every fact's skillId exists in profile.skills
  const knownSkillIds = new Set(profile.skills.map((s) => s.id));
  
  // Check experience facts
  for (const exp of profile.experiences) {
    for (const fact of exp.facts) {
      for (const skillId of fact.skillIds) {
        if (!knownSkillIds.has(skillId)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Fact "${fact.id}" references unknown skill "${skillId}" not present in profile skills`,
            path: ["experiences", exp.id, "facts", fact.id, "skillIds"],
          });
        }
      }
    }
  }

  // Check project facts
  for (const proj of profile.projects) {
    for (const fact of proj.facts) {
      for (const skillId of fact.skillIds) {
        if (!knownSkillIds.has(skillId)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Project fact "${fact.id}" references unknown skill "${skillId}" not present in profile skills`,
            path: ["projects", proj.id, "facts", fact.id, "skillIds"],
          });
        }
      }
    }
  }
});

export type Skill = z.infer<typeof SkillSchema>;
export type AtomicFact = z.infer<typeof AtomicFactSchema>;
export type Experience = z.infer<typeof ExperienceSchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type Education = z.infer<typeof EducationSchema>;
export type UserPreferences = z.infer<typeof UserPreferencesSchema>;
export type CareerProfile = z.infer<typeof CareerProfileSchema>;
export type FullProfile = z.infer<typeof FullProfileSchema>;
