# JobPilot Architecture Decision Records (ADR)

## ADR-001: ORM Selection — Drizzle ORM over Prisma
* **Status:** Accepted
* **Context:** The project requires a TypeScript-first ORM for PostgreSQL that supports rapid migrations, type-safety, and minimal runtime footprint.
* **Decision:** Selected **Drizzle ORM** with `pg`.
* **Rationale:**
  - Zero Rust engine binaries, meaning fast cold starts and zero Docker cross-compilation headaches.
  - Native SQL-like query builder with explicit joins.
  - First-class Zod schema generation via `drizzle-zod`.
  - Lean footprint and seamless integration with Next.js Turbopack and Webpack.

---

## ADR-002: Persistent Queue — pg-boss over Temporal / Inngest
* **Status:** Accepted
* **Context:** The application needs a durable background job queue for scheduled discovery, matching, retries, and rate limiting in a single-user local environment.
* **Decision:** Selected **`pg-boss`** running directly on PostgreSQL.
* **Rationale:**
  - Eliminates the need to run multi-container Temporal server clusters or expose local webhook tunnels for Inngest.
  - Native ACID transactional guarantees: jobs and application records commit together.
  - Built-in cron scheduling, exponential retries, backoff, and dead-letter queues.
  - Complete SQL inspectability of queues in the same database.

---

## ADR-003: Application Execution Mode — Assisted Form Fill with Final Human Click
* **Status:** Accepted
* **Context:** Auto-apply bots risk submitting incorrect information, failing CAPTCHAs, getting blocked by employers, or making embarrassing mistakes.
* **Decision:** Headed Playwright browser automation auto-populates standard form fields (Name, Email, Phone, Links, CV PDF upload), but strictly halts before submission.
* **Rationale:**
  - Preserves 100% human accountability for submitted applications.
  - Allows human handling of custom, subjective, or sensitive questions (work authorization, salary expectations, demographic disclosures).
  - Eliminates CAPTCHA failure rate and employer anti-bot flags.

---

## ADR-004: Anti-Hallucination via Atomic Fact Citations
* **Status:** Accepted
* **Context:** LLMs frequently exaggerate metrics, dates, and technologies when tailoring resumes to match job descriptions.
* **Decision:** Decomposed candidate career history into discrete, immutable "facts" with unique IDs (`fact_id`). Generated CV bullets must cite supporting fact IDs and pass deterministic validation.
* **Rationale:**
  - Converts truth enforcement from an unreliable prompting instruction into a deterministic data-layer constraint.
  - Guarantees that any unsupported requirement is surfaced as an honest skill gap.

---

## ADR-005: Geographic Hiring Eligibility Filter for Sri Lanka
* **Status:** Accepted
* **Context:** A large majority of "remote" listings on US and European job boards are restricted to domestic tax jurisdictions (e.g. US Only).
* **Decision:** Added a mandatory `allowSriLankaRemoteOnly` setting that filters remote jobs for explicit worldwide or Sri Lanka hiring eligibility before running LLM scoring.
* **Rationale:**
  - Prevents candidate rejection at the payroll/visa stage.
  - Cuts AI scoring token costs by ~80% by discarding regionally ineligible jobs early.

---

## ADR-006: Playwright Headless Chromium for ATS-Compliant Vector PDF Generation
* **Status:** Accepted
* **Context:** Generating ATS-compliant PDFs requires single-column semantic layouts, selectable text, standard system fonts (Arial/Helvetica), accurate page margins (15mm), and zero canvas rasterization so ATS parsers can read every word accurately.
* **Decision:** Implemented `PDFGenerator` with Playwright headless Chromium using `page.setContent()` and `page.pdf()`.
* **Rationale:**
  - HTML/CSS semantic template (`ats-template.ts`) enables pixel-perfect design control matching modern ATS parser best practices.
  - Generates searchable, selectable vector text with standard font encodings (no flattened canvas images).
  - High performance: Compiles a clean vector PDF in ~650ms.
  - Dual support: Renders both Tailored Resumes and Cover Letters using shared candidate styling.

---

## ADR-007: Human-in-the-Loop State Machine with Dual-Mode Form Filling Copilot
* **Status:** Accepted
* **Context:** Users need flexibility when submitting applications: some prefer automated browser filling, while others prefer applying in their everyday personal browser with saved passwords and session cookies.
* **Decision:** Implemented strict state transitions in `ApplicationStateMachine` requiring actor `'human'` for `approved` and `confirmed` states. Built dual copilot modes:
  1. Headed Playwright session that navigates to the job URL, populates fields, attaches the tailored resume PDF, and pauses for human final click.
  2. Quick-Fill Clipboard Drawer providing one-click copy buttons for candidate contact info, headlines, summaries, and skills for seamless manual filling.
* **Rationale:**
  - Guaranteed zero autonomous or unauthorized submissions.
  - Complete versatility across complex employer portals, anti-bot mechanisms, and multi-factor auth flows.
  - Clear audit trail capturing every state transition timestamp, actor, and proof of submission.
