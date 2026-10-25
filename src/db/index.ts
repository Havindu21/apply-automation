import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import * as dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.DATABASE_URL || "postgresql://jobpilot:jobpilot_secret@localhost:5432/jobpilot";

// Reuse pool across warm invocations in Next.js development
const globalForDb = globalThis as unknown as {
  conn: Pool | undefined;
};

export const pool = globalForDb.conn ?? new Pool({ connectionString });
if (process.env.NODE_ENV !== "production") globalForDb.conn = pool;

export const db = drizzle(pool, { schema });
export * from "./schema";
