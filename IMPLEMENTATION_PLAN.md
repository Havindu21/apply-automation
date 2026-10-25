# JobPilot Implementation Plan

## Phase 1: Foundation, Database & Profile Fact Engine (COMPLETED)
- [x] Next.js 16 App Router setup with React 19, TypeScript, and Tailwind CSS v4.
- [x] Docker Compose with PostgreSQL 16 Alpine, Web, and Worker services.
- [x] Drizzle ORM schema: profiles, skills, facts, experiences, projects, educations, career_profiles, user_preferences, jobs, matches, applications, job_execution_logs.
- [x] Spec 001 Zod validation schema with 8 acceptance criteria.
- [x] Initial CV data extraction from Havindu's CV ("HHH Fonseka - Associate Software Engineer - 2026.pdf") with unverified status.
- [x] Full Web UI dashboard: Overview, CV Import Review Portal, My Profile & Facts, Career Profiles, Preferences & Work Modes, Automation Center.
- [x] Decoupled `pg-boss` background worker entrypoint with scheduled jobs and execution history.
- [x] Vitest unit test suite (17 passing tests).
- [x] Zero-warning ESLint pass and clean production webpack build.

## Phase 2: Real Job Discovery, Geographic Filtering & Deduplication (COMPLETED)
- [x] Modular Source Adapters:
  - Remotive API (public JSON feed).
  - RemoteOK API (public JSON feed).
  - Jobicy API.
  - WeWorkRemotely RSS category feeds.
  - Greenhouse & Lever public board crawlers for company watchlists.
  - Manual job URL parser (paste any URL including LinkedIn).
- [x] Geographic Eligibility Engine:
  - Strict parser for allowed locations (Worldwide, Sri Lanka, APAC).
  - Rejection of US-only / EU-only jobs when candidate is in Sri Lanka.
  - Negative indicator flags (W2, C2C, US Citizens only).
- [x] Normalization & Deduplication:
  - Stable URL hash and fuzzy composite key (normalized company + title + location).
  - Persistent job storage in PostgreSQL.
- [x] Job Explorer Web UI:
  - Live search, filtering by eligibility and work mode.
  - Inspect Job modal with untrusted content delimiter warning.
  - Manual Job Ingestion modal.
  - Live discovery trigger button.

## Phase 3: Explainable Matching & Truthful CV Tailoring (COMPLETED)
- [x] Gemini AI Gateway:
  - Model tiering defaulting to `gemini-flash-latest` with fallback to `gemini-pro-latest`.
  - Structured JSON outputs strictly parsed.
  - Untrusted job description text enclosed in `<job_posting_untrusted>` tags.
- [x] Two-Tier Explainable Matcher:
  - Tier 1: Deterministic filter (work mode, geography, excluded companies).
  - Tier 2: AI structured scoring (skills alignment, seniority fit, gaps, 0–100 score).
  - Automatic career profile selection matching role requirements.
- [x] Truthful CV Generator & Deterministic Verifier:
  - Ground truth isolation: ONLY verified profile facts (`isVerified: true`) can be cited.
  - Zero-hallucination verifier: rejects unverified citations, non-existent facts, missing citations, metric hallucinations (numbers/percentages), and undeclared skills.
  - Transparent gap analysis: unsupported requirements surfaced honestly.
  - Grounded cover letter generator.
- [x] Application Studio Web UI:
  - Job selection, match analysis execution, visual score meter.
  - Side-by-side comparison: Base CV Ground Truth vs. Tailored Presentation.
  - Cited fact ID verification pills (`✓ cites fact-id`).
  - Cover letter viewer and gap breakdown.

## Phase 4: Application Review Queue & ATS PDF Generation (COMPLETED)
- [x] ATS-compliant single-column resume template (semantic HTML/CSS with standard headings, selectable text, and print margins).
- [x] Formal cover letter semantic template with company and role targeting.
- [x] Playwright headless Chromium vector PDF generator (`page.pdf`).
- [x] Application state machine (`ApplicationStateMachine`): strict legal transitions from `discovered` to `confirmed applied`.
- [x] Human Gatekeeper policy: system/AI actors strictly blocked from approving applications or marking confirmed without human action.
- [x] Application Service (`ApplicationService`) with PostgreSQL persistence and in-memory fallback.
- [x] PDF streaming download endpoint (`GET /api/applications/[id]/pdf`) and preview endpoint (`GET /api/applications/[id]/preview`).
- [x] Review Queue & Pipeline Web UI (`ApplicationTrackerTab.tsx`) with Kanban columns, approval actions, and audit trail.

## Phase 5: Assisted Application Copilot & Analytics (COMPLETED)
- [x] Form Copilot (`FormCopilot` in `src/lib/copilot/form-filler.ts`):
  - ATS platform detection (Greenhouse, Lever, Ashby, Generic).
  - Candidate form payload preparation (first/last names, contact info, portfolio, skills, summary).
  - Headed Playwright browser automation pre-populating inputs and uploading tailored resume PDF.
  - Non-negotiable human gatekeeper: strictly halts before final submit for user inspection and click.
- [x] Quick-Fill Clipboard Drawer with one-click copy buttons for candidate contact info and tailored content.
- [x] Application submission confirmation workflow with user evidence logging.
- [x] Search & Conversion Analytics dashboard (`AnalyticsTab.tsx`):
  - Stage-by-stage pipeline conversion funnel.
  - Interview conversion rate tracking.
  - 100% verified facts grounding compliance metric.
  - Geographic filter yield (Worldwide / Sri Lanka remote roles count).
