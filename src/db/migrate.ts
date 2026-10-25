import { pool } from "./index";

export async function runMigrations() {
  console.log("Applying database table definitions...");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Profiles
    await client.query(`
      CREATE TABLE IF NOT EXISTS profiles (
        id TEXT PRIMARY KEY,
        full_name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT,
        location TEXT,
        headline TEXT,
        summary TEXT,
        github_url TEXT,
        linkedin_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    // Skills
    await client.query(`
      CREATE TABLE IF NOT EXISTS skills (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        category TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    // Facts
    await client.query(`
      CREATE TABLE IF NOT EXISTS facts (
        id TEXT PRIMARY KEY,
        profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        text VARCHAR(300) NOT NULL,
        skill_ids JSONB DEFAULT '[]'::jsonb NOT NULL,
        evidence TEXT,
        source TEXT DEFAULT 'cv_import' NOT NULL,
        is_verified BOOLEAN DEFAULT FALSE NOT NULL,
        version INTEGER DEFAULT 1 NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    // Experiences
    await client.query(`
      CREATE TABLE IF NOT EXISTS experiences (
        id TEXT PRIMARY KEY,
        profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        company TEXT NOT NULL,
        role TEXT NOT NULL,
        location TEXT,
        start_date VARCHAR(7) NOT NULL,
        end_date VARCHAR(7),
        is_current BOOLEAN DEFAULT FALSE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    // Experience Facts
    await client.query(`
      CREATE TABLE IF NOT EXISTS experience_facts (
        id TEXT PRIMARY KEY,
        experience_id TEXT NOT NULL REFERENCES experiences(id) ON DELETE CASCADE,
        fact_id TEXT NOT NULL REFERENCES facts(id) ON DELETE CASCADE,
        display_order INTEGER DEFAULT 0 NOT NULL
      );
    `);

    // Projects
    await client.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        role TEXT,
        description TEXT,
        live_url TEXT,
        repo_url TEXT,
        technologies JSONB DEFAULT '[]'::jsonb NOT NULL,
        start_date VARCHAR(7),
        end_date VARCHAR(7),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    // Project Facts
    await client.query(`
      CREATE TABLE IF NOT EXISTS project_facts (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        fact_id TEXT NOT NULL REFERENCES facts(id) ON DELETE CASCADE,
        display_order INTEGER DEFAULT 0 NOT NULL
      );
    `);

    // Educations
    await client.query(`
      CREATE TABLE IF NOT EXISTS educations (
        id TEXT PRIMARY KEY,
        profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        institution TEXT NOT NULL,
        degree TEXT NOT NULL,
        start_date VARCHAR(7) NOT NULL,
        end_date VARCHAR(7),
        is_current BOOLEAN DEFAULT FALSE NOT NULL,
        grade TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    // Career Profiles
    await client.query(`
      CREATE TABLE IF NOT EXISTS career_profiles (
        id TEXT PRIMARY KEY,
        profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        priority INTEGER DEFAULT 1 NOT NULL,
        is_enabled BOOLEAN DEFAULT TRUE NOT NULL,
        target_titles JSONB DEFAULT '[]'::jsonb NOT NULL,
        highlight_skill_ids JSONB DEFAULT '[]'::jsonb NOT NULL,
        summary_headline TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    // User Preferences
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_preferences (
        id TEXT PRIMARY KEY,
        profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        work_modes JSONB DEFAULT '{"remote": true, "hybrid": false, "onsite": false}'::jsonb NOT NULL,
        allow_sri_lanka_remote_only BOOLEAN DEFAULT TRUE NOT NULL,
        target_locations JSONB DEFAULT '["Sri Lanka", "Worldwide", "Remote"]'::jsonb NOT NULL,
        target_titles JSONB DEFAULT '[]'::jsonb NOT NULL,
        excluded_companies JSONB DEFAULT '[]'::jsonb NOT NULL,
        excluded_technologies JSONB DEFAULT '[]'::jsonb NOT NULL,
        min_salary INTEGER,
        salary_currency TEXT DEFAULT 'USD' NOT NULL,
        max_job_age_days INTEGER DEFAULT 14 NOT NULL,
        min_match_score INTEGER DEFAULT 65 NOT NULL,
        max_applications_per_day INTEGER DEFAULT 5 NOT NULL,
        automation_enabled BOOLEAN DEFAULT FALSE NOT NULL,
        automation_cron TEXT DEFAULT '0 8 * * *' NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    // Job Execution Logs
    await client.query(`
      CREATE TABLE IF NOT EXISTS job_execution_logs (
        id TEXT PRIMARY KEY,
        job_type TEXT NOT NULL,
        status TEXT NOT NULL,
        source TEXT,
        items_processed INTEGER DEFAULT 0 NOT NULL,
        items_succeeded INTEGER DEFAULT 0 NOT NULL,
        items_failed INTEGER DEFAULT 0 NOT NULL,
        error_message TEXT,
        details JSONB DEFAULT '{}'::jsonb,
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        completed_at TIMESTAMP
      );
    `);

    // Jobs
    await client.query(`
      CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY,
        source TEXT NOT NULL,
        source_id TEXT NOT NULL,
        url_hash TEXT UNIQUE NOT NULL,
        url TEXT NOT NULL,
        title TEXT NOT NULL,
        company TEXT NOT NULL,
        location TEXT,
        work_mode TEXT DEFAULT 'unknown' NOT NULL,
        is_worldwide_remote BOOLEAN DEFAULT FALSE NOT NULL,
        allowed_locations JSONB DEFAULT '[]'::jsonb,
        description TEXT NOT NULL,
        salary_raw TEXT,
        posted_at TIMESTAMP,
        discovered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        status TEXT DEFAULT 'discovered' NOT NULL
      );
    `);

    // Matches
    await client.query(`
      CREATE TABLE IF NOT EXISTS matches (
        id TEXT PRIMARY KEY,
        job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
        career_profile_id TEXT NOT NULL REFERENCES career_profiles(id) ON DELETE CASCADE,
        match_score INTEGER NOT NULL,
        strengths JSONB DEFAULT '[]'::jsonb,
        gaps JSONB DEFAULT '[]'::jsonb,
        eligible BOOLEAN DEFAULT TRUE NOT NULL,
        explanation TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    // Applications
    await client.query(`
      CREATE TABLE IF NOT EXISTS applications (
        id TEXT PRIMARY KEY,
        job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
        status TEXT DEFAULT 'discovered' NOT NULL,
        tailored_cv_json JSONB,
        cover_letter TEXT,
        cited_fact_ids JSONB DEFAULT '[]'::jsonb,
        method TEXT DEFAULT 'assisted_form',
        confirmation_evidence TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      );
    `);

    await client.query("COMMIT");
    console.log("Migrations applied successfully.");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Migration failed:", error);
    throw error;
  } finally {
    client.release();
  }
}

if (process.argv[1]?.endsWith("migrate.ts")) {
  runMigrations()
    .then(() => pool.end())
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
