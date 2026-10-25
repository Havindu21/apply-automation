import { pgTable, text, varchar, integer, boolean, timestamp, jsonb, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// 1. User Profiles
export const profiles = pgTable("profiles", {
  id: text("id").primaryKey(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  location: text("location"),
  headline: text("headline"),
  summary: text("summary"),
  githubUrl: text("github_url"),
  linkedinUrl: text("linkedin_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 2. Skills
export const skills = pgTable("skills", {
  id: text("id").primaryKey(), // lowercase slug, e.g. "react", "spring-boot"
  name: text("name").notNull().unique(),
  category: text("category").notNull(), // 'frontend' | 'backend' | 'mobile' | 'ai_ml' | 'database' | 'auth' | 'tools'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 3. Atomic Facts (Immutable Ground Truth for Tailoring)
export const facts = pgTable("facts", {
  id: text("id").primaryKey(), // e.g. "fact-calsda-data-freeze"
  profileId: text("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  text: varchar("text", { length: 300 }).notNull(),
  skillIds: jsonb("skill_ids").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  evidence: text("evidence"),
  source: text("source").notNull().default("cv_import"), // 'cv_import' | 'manual' | 'repository'
  isVerified: boolean("is_verified").notNull().default(false), // MUST be verified by user to be trusted
  version: integer("version").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 4. Employment Experience
export const experiences = pgTable("experiences", {
  id: text("id").primaryKey(),
  profileId: text("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  company: text("company").notNull(),
  role: text("role").notNull(),
  location: text("location"),
  startDate: varchar("start_date", { length: 7 }).notNull(), // YYYY-MM
  endDate: varchar("end_date", { length: 7 }), // YYYY-MM or null
  isCurrent: boolean("is_current").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 5. Experience - Fact join
export const experienceFacts = pgTable("experience_facts", {
  id: text("id").primaryKey(),
  experienceId: text("experience_id").notNull().references(() => experiences.id, { onDelete: "cascade" }),
  factId: text("fact_id").notNull().references(() => facts.id, { onDelete: "cascade" }),
  displayOrder: integer("display_order").notNull().default(0),
});

// 6. Projects
export const projects = pgTable("projects", {
  id: text("id").primaryKey(),
  profileId: text("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  role: text("role"),
  description: text("description"),
  liveUrl: text("live_url"),
  repoUrl: text("repo_url"),
  technologies: jsonb("technologies").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  startDate: varchar("start_date", { length: 7 }),
  endDate: varchar("end_date", { length: 7 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 7. Project - Fact join
export const projectFacts = pgTable("project_facts", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  factId: text("fact_id").notNull().references(() => facts.id, { onDelete: "cascade" }),
  displayOrder: integer("display_order").notNull().default(0),
});

// 8. Education
export const educations = pgTable("educations", {
  id: text("id").primaryKey(),
  profileId: text("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  institution: text("institution").notNull(),
  degree: text("degree").notNull(),
  startDate: varchar("start_date", { length: 7 }).notNull(),
  endDate: varchar("end_date", { length: 7 }),
  isCurrent: boolean("is_current").notNull().default(false),
  grade: text("grade"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 9. Career Profiles (Configurable targets sharing atomic facts)
export const careerProfiles = pgTable("career_profiles", {
  id: text("id").primaryKey(),
  profileId: text("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  title: text("title").notNull(), // e.g. "Frontend Engineer", "Full-stack Developer"
  priority: integer("priority").notNull().default(1),
  isEnabled: boolean("is_enabled").notNull().default(true),
  targetTitles: jsonb("target_titles").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  highlightSkillIds: jsonb("highlight_skill_ids").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  summaryHeadline: text("summary_headline"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 10. User Preferences & Filter Settings
export const userPreferences = pgTable("user_preferences", {
  id: text("id").primaryKey(),
  profileId: text("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  workModes: jsonb("work_modes").$type<{ remote: boolean; hybrid: boolean; onsite: boolean }>().notNull().default(sql`'{"remote": true, "hybrid": false, "onsite": false}'::jsonb`),
  allowSriLankaRemoteOnly: boolean("allow_sri_lanka_remote_only").notNull().default(true),
  targetLocations: jsonb("target_locations").$type<string[]>().notNull().default(sql`'["Sri Lanka", "Worldwide", "Remote"]'::jsonb`),
  targetTitles: jsonb("target_titles").$type<string[]>().notNull().default(sql`'["Software Engineer", "Frontend Engineer", "React Developer", "Full-stack Developer", "Backend Engineer"]'::jsonb`),
  excludedCompanies: jsonb("excluded_companies").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  excludedTechnologies: jsonb("excluded_technologies").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  minSalary: integer("min_salary"),
  salaryCurrency: text("salary_currency").notNull().default("USD"),
  maxJobAgeDays: integer("max_job_age_days").notNull().default(14),
  minMatchScore: integer("min_match_score").notNull().default(65),
  maxApplicationsPerDay: integer("max_applications_per_day").notNull().default(5),
  automationEnabled: boolean("automation_enabled").notNull().default(false),
  automationCron: text("automation_cron").notNull().default("0 8 * * *"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 11. Background Job Execution History
export const jobExecutionLogs = pgTable("job_execution_logs", {
  id: text("id").primaryKey(),
  jobType: text("job_type").notNull(), // 'discovery' | 'matching' | 'cleanup'
  status: text("status").notNull(), // 'pending' | 'running' | 'completed' | 'failed'
  source: text("source"),
  itemsProcessed: integer("items_processed").notNull().default(0),
  itemsSucceeded: integer("items_succeeded").notNull().default(0),
  itemsFailed: integer("items_failed").notNull().default(0),
  errorMessage: text("error_message"),
  details: jsonb("details").$type<Record<string, unknown>>().default(sql`'{}'::jsonb`),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

// 12. Ingested Jobs
export const jobs = pgTable("jobs", {
  id: text("id").primaryKey(),
  source: text("source").notNull(), // 'remotive' | 'remoteok' | 'greenhouse' | 'lever' | 'manual'
  sourceId: text("source_id").notNull(),
  urlHash: text("url_hash").notNull().unique(),
  url: text("url").notNull(),
  title: text("title").notNull(),
  company: text("company").notNull(),
  location: text("location"),
  workMode: text("work_mode").notNull().default("unknown"), // 'remote' | 'hybrid' | 'onsite' | 'unknown'
  isWorldwideRemote: boolean("is_worldwide_remote").notNull().default(false),
  allowedLocations: jsonb("allowed_locations").$type<string[]>().default(sql`'[]'::jsonb`),
  description: text("description").notNull(),
  salaryRaw: text("salary_raw"),
  postedAt: timestamp("posted_at"),
  discoveredAt: timestamp("discovered_at").defaultNow().notNull(),
  status: text("status").notNull().default("discovered"), // 'discovered' | 'filtered_out' | 'matched' | 'archived'
}, (table) => [
  uniqueIndex("job_url_hash_idx").on(table.urlHash),
]);

// 13. Job Matches
export const matches = pgTable("matches", {
  id: text("id").primaryKey(),
  jobId: text("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
  careerProfileId: text("career_profile_id").notNull().references(() => careerProfiles.id, { onDelete: "cascade" }),
  matchScore: integer("match_score").notNull(),
  strengths: jsonb("strengths").$type<string[]>().default(sql`'[]'::jsonb`),
  gaps: jsonb("gaps").$type<string[]>().default(sql`'[]'::jsonb`),
  eligible: boolean("eligible").notNull().default(true),
  explanation: text("explanation"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 14. Applications & State Machine
export const applications = pgTable("applications", {
  id: text("id").primaryKey(),
  jobId: text("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("discovered"), 
  // 'discovered' | 'matched' | 'prepared' | 'review' | 'approved' | 'applying' | 'submitted' | 'confirmed' | 'responded' | 'interview' | 'offer' | 'rejected' | 'withdrawn'
  tailoredCvJson: jsonb("tailored_cv_json").$type<Record<string, unknown>>(),
  coverLetter: text("cover_letter"),
  citedFactIds: jsonb("cited_fact_ids").$type<string[]>().default(sql`'[]'::jsonb`),
  method: text("method").default("assisted_form"), // 'assisted_form' | 'email' | 'manual'
  confirmationEvidence: text("confirmation_evidence"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
