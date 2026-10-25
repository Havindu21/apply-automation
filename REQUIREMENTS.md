# JobPilot Requirements Specification

## 1. Functional Requirements

### 1.1 Profile & Fact Management
- **FR-1.1:** Store candidate professional details (full name, email, phone, location, headline, summary, links).
- **FR-1.2:** Store skills categorized into Frontend, Backend, Mobile, AI/ML, Auth & Security, Database, Tools.
- **FR-1.3:** Store atomic accomplishments ("facts") with unique ID, character limits (1–300), linked skill IDs, evidence, and verification flag.
- **FR-1.4:** Reject duplicate skill IDs within a fact and reject facts referencing skills absent from the candidate profile.
- **FR-1.5:** Initial CV import parses data into unverified facts, requiring explicit human verification before inclusion in candidate ground truth.

### 1.2 Career Targets
- **FR-2.1:** Support 5 distinct career target profiles:
  1. Frontend Engineer (React / Next.js)
  2. Full-Stack Software Engineer (React + Spring Boot)
  3. Backend Engineer (Java / Spring Boot / NestJS)
  4. Mobile Developer (Flutter)
  5. AI Application Engineer (RAG / LLMs)
- **FR-2.2:** All career profiles must draw from the identical verified fact database without altering ground truth.

### 1.3 Search Preferences & Work-Mode Controls
- **FR-3.1:** Persistent toggles for Remote, Hybrid, and Onsite work modes.
- **FR-3.2:** Prevent disabling all three work modes simultaneously.
- **FR-3.3:** Dedicated Sri Lanka Remote Eligibility filter (`allowSriLankaRemoteOnly`) to eliminate US-only / EU-only jobs.
- **FR-3.4:** Configurable salary threshold, target job titles, and cron automation schedule.

### 1.4 Background Automation & Execution History
- **FR-4.1:** Background jobs managed via `pg-boss` with persistent logging in `job_execution_logs`.
- **FR-4.2:** Support manual execution triggers directly from the Web UI.

---

## 2. Non-Functional Requirements

- **NFR-1 (Truthfulness):** Zero fabricated claims, numbers, dates, or skills in generated documents.
- **NFR-2 (Safety):** Never submit an application headlessly or autonomously without explicit human confirmation.
- **NFR-3 (Reliability):** Worker and web service decoupled; retries with exponential backoff on queue jobs.
- **NFR-4 (Performance):** Sub-second UI updates, fast builds, zero memory leaks.
