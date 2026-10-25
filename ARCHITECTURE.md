# JobPilot Architecture Documentation

## System Topology

```
+-------------------------------------------------------------+
|                     Next.js 16 Web App                      |
|  - Dashboard & Fact Bank          - Work-Mode Preferences   |
|  - CV Import Verification Portal  - Application Studio      |
|  - Career Profiles Manager        - Job Explorer            |
+------------------------------+------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|                   Service & Verification Layer              |
|  - ProfileService                 - Fact Verifier           |
|  - Zod Validation Schemas         - Discovery Orchestrator  |
+-------------------+---------------------+-------------------+
                    |                     |
                    v                     v
+--------------------------+  +-------------------------------+
|   PostgreSQL 16 Database |  |  pg-boss Background Worker    |
|  - profiles, facts       |  |  - Scheduled Discovery        |
|  - experiences, projects |  |  - Two-Stage Job Matching     |
|  - career_profiles       |  |  - Application Queue          |
|  - user_preferences      |  |  - Retry & Dead-Letter Log    |
|  - jobs, matches, apps   |  +---------------+---------------+
|  - pgboss job queue      |                  |
+--------------------------+                  v
                               +------------------------------+
                               |   External Job Adapters      |
                               |  - Remotive, RemoteOK        |
                               |  - WeWorkRemotely RSS        |
                               |  - Greenhouse/Lever/Ashby    |
                               +------------------------------+
```

## Key Architectural Principles

1. **Atomic Fact Ground Truth:**
   No experience statement can be generated unless linked to an approved `fact_id` in the database. Facts have unique IDs, link to verified skills, and track version history.
2. **Strict Verification State Machine:**
   Facts parsed from external resumes start in an `is_verified: false` state. The LLM tailoring engine is forbidden from citing unverified facts.
3. **Decoupled Worker & Web Service:**
   The `worker` process runs independently of the Next.js web server. If Next.js restarts or undergoes hot-reloading, scheduled jobs continue unabated with transactional idempotency via `pg-boss`.
4. **Resilient Data Access:**
   `ProfileService` falls back gracefully to in-memory state when Docker Postgres is initializing or running in offline CI test environments.
5. **Geographic Filtering Before LLM Evaluation:**
   To protect AI budget and candidate time, jobs are strictly evaluated for country/worldwide eligibility before invoking AI scoring.
