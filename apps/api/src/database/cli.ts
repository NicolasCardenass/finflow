/**
 * Database commands:
 *   node dist/database/cli.js migrate   apply pending migrations
 *   node dist/database/cli.js seed      migrate, then (re)create the demo user
 */
import { validateEnv } from "../config.js";
import { createDatabase, createPool, runMigrations } from "./client.js";
import { DEMO_USER } from "./seed-data.js";
import { seed } from "./seed.js";

const command = process.argv[2];
if (command !== "migrate" && command !== "seed") {
  console.error("Usage: cli.js <migrate|seed>");
  process.exit(1);
}

const env = validateEnv(process.env);
const pool = createPool(env.DATABASE_URL);
const db = createDatabase(pool);

try {
  await runMigrations(db);
  console.log("Migrations applied.");
  if (command === "seed") {
    const summary = await seed(db);
    console.log(
      `Seeded ${DEMO_USER.email} (password: ${DEMO_USER.password}) with ` +
        `${summary.accounts} accounts, ${summary.transactions} transactions and ` +
        `${summary.budgets} budgets.`,
    );
  }
} finally {
  await pool.end();
}
