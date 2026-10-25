# JobPilot — AI Job Search & Truthful Application Copilot

JobPilot is a production-quality, single-user job search copilot engineered to help software engineers discover, filter, rank, and truthfully apply to jobs.

Unlike generic auto-apply bots that spam hundreds of resumes or hallucinate skills to pass keyword filters, JobPilot prioritizes:
1. **Zero Hallucination Guarantee:** Every claim in an AI-tailored CV cites an immutable, user-verified atomic `fact_id`.
2. **Human-in-the-Loop ("Copilot" over "Autopilot"):** No application is ever sent without your explicit document inspection and approval.
3. **Geographic Hiring Eligibility:** Automatically screens out remote jobs that reject applicants based in Sri Lanka or outside specific tax jurisdictions.
4. **Targeted Career Profiles:** Evaluates jobs against multiple targets (Frontend, Full-Stack, Backend, Flutter, AI Application) backed by the same ground truth facts.

---

## Architecture Overview

* **Frontend:** Next.js 16 (App Router, React 19, TypeScript, Tailwind CSS v4, Lucide Icons).
* **Backend:** Next.js Route Handlers & Server Actions validated end-to-end with Zod.
* **Database & ORM:** PostgreSQL 16 with Drizzle ORM.
* **Persistent Queue:** `pg-boss` running on PostgreSQL for background discovery, matching, and scheduled execution.
* **AI Provider:** Provider abstraction defaulting to Google Gemini (`@google/genai`) with structured JSON outputs.
* **Document Engine:** ATS-friendly single-column HTML/CSS templates rendered to PDF via Playwright.
* **Assisted Application:** Playwright headed browser form fill with user confirmation.

---

## Quickstart & Local Setup

### Prerequisites
* Node.js v20.9+ (Tested on v24.3.0)
* Docker & Docker Compose

### 1. Clone & Install
```bash
git clone <repo-url>
cd apply-automation
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
```
Ensure your database credentials and optional `GEMINI_API_KEY` are configured.

### 3. Start PostgreSQL with Docker Compose
```bash
docker compose up -d postgres
```

### 4. Apply Database Migrations & Seed Data
```bash
npm run db:migrate
npm run db:seed
```

### 5. Run the Web Application & Background Worker

**Web UI (Next.js):**
```bash
npm run dev
# Open http://localhost:3000
```

**Background Worker (pg-boss):**
```bash
npm run worker
```

### 6. Run Complete Test Suite & Lint
```bash
npm test
npm run lint
npm run build
```

---

## Phased Roadmap & Status

* **Phase 1 (Complete):** Foundation, PostgreSQL database, Drizzle ORM, atomic fact schema, CV import verification UI, career profiles, work-mode preference controls, and pg-boss worker skeleton.
* **Phase 2 (Complete):** Modular job discovery adapters (Remotive, RemoteOK, Jobicy, WeWorkRemotely RSS, Greenhouse/Lever watchlist, manual URL paste), geographic eligibility filtering, and SHA-256 deduplication.
* **Phase 3 (Complete):** Two-tier matching engine (deterministic filters + Gemini structured scoring) and truthful CV tailoring with deterministic fact verifier.
* **Phase 4 (Complete):** Application Studio, side-by-side CV comparison, ATS PDF generation with Playwright Chromium, and human review pipeline.
* **Phase 5 (Complete):** Assisted application copilot (Playwright form fill with human final click), Quick-Fill Clipboard drawer, application state machine, and search & conversion analytics dashboard.
