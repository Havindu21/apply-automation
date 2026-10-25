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

## Phase 3: Explainable Matching & Truthful CV Tailoring (NEXT)
- [ ] Two-tier matcher:
  - Tier 1: Deterministic boolean filter (work mode, geography, excluded companies).
  - Tier 2: Gemini structured scoring (skills alignment, seniority fit, gaps, 0–100 score).
- [ ] Truthful CV generator:
  - Automatic career profile selection.
  - Reordering and tailoring verified facts without altering meaning.
  - Deterministic verifier: fact ID check, lexical/number match, zero hallucinated skills.
- [ ] Gap analysis report (unsupported job requirements shown honestly).

## Phase 4: Application Studio, Review Queue & ATS PDF Generation
- [ ] Application Studio UI: side-by-side diff comparison between Base CV and Tailored CV.
- [ ] ATS-compliant single-column resume template (semantic HTML/CSS).
- [ ] Playwright server-side PDF generator (`page.pdf`).
- [ ] Application pipeline status tracker (Discovered -> Matched -> Prepared -> Review -> Approved -> Applying -> Confirmed).

## Phase 5: Assisted Application Copilot & Analytics
- [ ] Playwright headed browser form fill (Greenhouse, Lever, Ashby):
  - Pre-fills contact details, uploads generated PDF, stops for user inspection.
  - Final human click required for submission.
- [ ] Email application drafter (mailto / formatted copy).
- [ ] Analytics dashboard: funnel metrics, response rate, interview conversion, source effectiveness.
