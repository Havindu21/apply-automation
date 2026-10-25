# JobPilot Security & Safety Model

## 1. Lethal Trifecta Mitigation
The "Lethal Trifecta" in AI agents occurs when:
1. The agent has access to private personal data (your CV, email, address, phone).
2. The agent reads untrusted external data (job descriptions, web scrapings).
3. The agent possesses external communication tools (sending emails, submitting forms).

### Mitigation Architecture
* **Tool-Less Reading Stage:** The pipeline component that fetches and parses job descriptions runs with **zero outbound tools** and no network capabilities. Job description text is treated as untrusted data and enclosed in delimiter tags (`<job_posting_untrusted>`).
* **Strict Structured Outputs:** The LLM does not execute code; it returns typed JSON validated strictly through Zod schemas.
* **Separation of Concerns:** The application submission tool (Playwright / email) is isolated from the analysis and scoring layer.
* **Human Approval Barrier:** Application submissions are impossible without an explicit user click on the UI.

---

## 2. Truthfulness & Zero-Hallucination Policy
* **Fact Citation Requirement:** Every bullet point in a generated CV must output `{ text: string, cited_fact_ids: string[] }`.
* **Deterministic Lexical Verifier:**
  - Checks that every cited `fact_id` exists and is marked `is_verified: true`.
  - Rejects any bullet introducing company names, job titles, dates, numbers, or percentages not present in the cited facts.
  - Rejects any technical skill in the skills list that is not linked to an approved fact.
* **Unverified Fact Isolation:** Data imported from external CVs is quarantined in an unverified state until the user explicitly confirms it.

---

## 3. Data Privacy & Local-First Isolation
* **Local Hosting:** The application runs on `localhost` with a local PostgreSQL container. No personal career data is transmitted to third-party databases or analytics servers.
* **Secrets Management:** Sensitive keys (`GEMINI_API_KEY`, database credentials) are loaded from `.env` and excluded from Git commits via `.gitignore`.
* **No Headless Submissions:** For web forms (Greenhouse, Lever, Ashby), Playwright opens a visible browser, fills basic fields, and leaves the final "Submit" button to the user.
