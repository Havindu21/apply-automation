# JobPilot Implementation Progress

## Status Summary

* **Current Phase:** Phase 2 (Real Job Discovery, Filtering & Deduplication) — **COMPLETED**
* **Next Phase:** Phase 3 (Explainable Matching & Truthful CV Tailoring)
* **Overall Health:** 24/24 unit tests passing, production build passing, 0 ESLint errors/warnings.

---

## Completed Milestones in Phase 2

1. **Modular Job Source Adapters:**
   - Remotive adapter fetching real developer postings with `candidate_required_location`.
   - RemoteOK adapter handling API payloads, skipping legal header metadata.
   - Jobicy adapter for remote tech postings with `jobGeo`.
   - WeWorkRemotely RSS feed crawler for full-stack, frontend, and backend programming categories.
   - Greenhouse and Lever ATS watchlist crawlers for target remote engineering companies.
   - Manual job URL parser for pasting any job link (e.g. LinkedIn, company pages).

2. **Geographic Hiring Eligibility Engine:**
   - Implemented `evaluateGeographicEligibility` with positive flags (Worldwide, Sri Lanka, APAC) and negative constraint flags (US Only, US Work Auth Required, W2 Only, No C2C, Canada Only, EU/UK Only).
   - Automatically quarantines US-only or regionally restricted postings when `allowSriLankaRemoteOnly` is active.

3. **Normalization & Deduplication:**
   - Stable URL hash ignoring tracking query parameters (`utm_*`, `ref`, etc.).
   - Composite key `company::title::location` across common title variations (e.g. `sr.` vs `senior`, `swe` vs `software engineer`).

4. **Job Explorer Dashboard:**
   - Search bar across title, company, and description.
   - Eligibility filter toggle ("Sri Lanka & Worldwide Eligible Only").
   - Detailed job cards with eligibility reason pills, work mode, and salary indicators.
   - "Inspect Job" modal with `<job_posting_untrusted>` warning banner.
   - "Paste Job URL" dialog for manual job ingestion.
   - Live discovery trigger with real-time feedback.

---

## Completed Milestones in Phase 1

1. **Stack Initialization:**
   - Initialized Next.js 16 (React 19, TypeScript strict mode, Tailwind CSS v4, Lucide Icons).
   - Configured Docker Compose defining `postgres` (PostgreSQL 16 Alpine), `web`, and `worker` services.
   - Pinned `.env.example` and `.gitignore` ignoring sensitive data and generated PDFs.

2. **Database & ORM Layer:**
   - Built full Drizzle ORM schema (`src/db/schema.ts`) covering 14 tables: `profiles`, `skills`, `facts`, `experiences`, `experience_facts`, `projects`, `project_facts`, `educations`, `career_profiles`, `user_preferences`, `job_execution_logs`, `jobs`, `matches`, `applications`.
   - Created database connection pool (`src/db/index.ts`) with warm reuse for Next.js development.
   - Created database migration script (`src/db/migrate.ts`) and seed script (`src/db/seed.ts`).

3. **Atomic Fact Ground Truth & Validation (Spec 001):**
   - Implemented Zod schema with strict validations in `src/lib/validation/profile.ts`.
   - Verified 8 acceptance criteria via Vitest:
     - Valid profile passes.
     - Invalid date format (non YYYY-MM) rejected.
     - End date before start date rejected.
     - Disabling all work modes rejected.
     - Fact referencing an unknown skill rejected.
     - Duplicate skill IDs in a fact rejected.
     - Empty or >300 char fact text rejected.
     - Experience with no facts rejected.

4. **Havindu's CV Initial Extraction & Verification Portal:**
   - Accurately extracted candidate data from `HHH Fonseka - Associate Software Engineer - 2026.pdf` into `src/lib/cv/initial-cv-data.ts`.
   - Enforced initial unverified state (`isVerified: false`) on all facts.
   - Created 5 distinct Career Profiles (Frontend, Full-Stack, Backend, Flutter, AI Application).
   - Configured Sri Lanka geographic eligibility guard as default.

5. **Web Interface:**
   - **Navbar:** Sticky header with active tab indicator and dynamic unverified fact counter badge.
   - **Overview Tab:** Summary metrics, unverified facts alert banner, career target status, manual discovery button.
   - **CV Import Review Portal:** Detailed list of all extracted CV facts, verification status pills, "Verify Fact" toggles, and "Verify All" batch action.
   - **My Profile & Fact Bank:** Contact info, skill categories, experience timeline, and associated atomic facts.
   - **Career Profiles Tab:** Enable/disable toggles, priority badges, target job titles, and emphasized skills.
   - **Preferences Tab:** Persistent work-mode toggles (Remote, Hybrid, Onsite), Sri Lanka geographic filter, salary and matching thresholds, and cron schedule configuration.
   - **Automation Center:** History table for `pg-boss` executions with duration and error inspection.

6. **Decoupled Worker Service:**
   - Implemented `src/worker/index.ts` using `pg-boss` on PostgreSQL.
   - Registered `job-discovery`, `job-matching`, and `health-check` queues.
   - Dynamically syncs recurring schedules with `user_preferences.automation_cron`.
   - Logs full execution history and error stacks to `job_execution_logs`.

7. **Verification & Quality:**
   - 17 of 17 Vitest tests passing.
   - Zero ESLint errors or warnings.
   - Next.js production build passing with all routes generated.
