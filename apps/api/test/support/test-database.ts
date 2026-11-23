import pg from "pg";
import { createDatabase, createPool, runMigrations } from "../../src/database/client.js";

/** Admin connection used to create throwaway databases (see README). */
export const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;

export type TestDatabase = { url: string; drop: () => Promise<void> };

/** Create an empty, fully migrated database for one test file. */
export async function createTestDatabase(prefix: string): Promise<TestDatabase> {
  if (!TEST_DATABASE_URL) throw new Error("TEST_DATABASE_URL is not set");
  const name = `finflow_${prefix}_${process.pid}_${Date.now()}`;

  const admin = new pg.Client({ connectionString: TEST_DATABASE_URL });
  await admin.connect();
  await admin.query(`CREATE DATABASE "${name}"`);

  const url = new URL(TEST_DATABASE_URL);
  url.pathname = `/${name}`;
  const pool = createPool(url.toString());
  await runMigrations(createDatabase(pool));
  await pool.end();

  return {
    url: url.toString(),
    drop: async () => {
      await admin.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
      await admin.end();
    },
  };
}
