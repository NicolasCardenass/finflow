import bcrypt from "bcryptjs";
import { count, eq, sql } from "drizzle-orm";
import pg from "pg";
import {
  createDatabase,
  createPool,
  runMigrations,
  type Database,
} from "../src/database/client.js";
import { accounts, budgets, categories, transactions, users } from "../src/database/schema.js";
import { DEMO_USER, monthStart, seededRandom } from "../src/database/seed-data.js";
import { seed } from "../src/database/seed.js";

/**
 * Runs against a real PostgreSQL server: set TEST_DATABASE_URL to a
 * connection string with permission to create databases (e.g. the postgres
 * superuser of a local or CI instance). A throwaway database is created for
 * the run and dropped afterwards.
 */
const adminUrl = process.env.TEST_DATABASE_URL;

describe.skipIf(!adminUrl)("Database schema, migrations and seed", () => {
  const name = `finflow_test_${process.pid}_${Date.now()}`;
  let admin: pg.Client;
  let pool: pg.Pool;
  let db: Database;

  beforeAll(async () => {
    admin = new pg.Client({ connectionString: adminUrl });
    await admin.connect();
    await admin.query(`CREATE DATABASE "${name}"`);
    const url = new URL(adminUrl!);
    url.pathname = `/${name}`;
    pool = createPool(url.toString());
    db = createDatabase(pool);
    await runMigrations(db);
  });

  afterAll(async () => {
    await pool?.end();
    await admin?.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
    await admin?.end();
  });

  it("is idempotent: running migrations again changes nothing", async () => {
    await expect(runMigrations(db)).resolves.toBeUndefined();
  });

  it("seeds a demo user with accounts, transactions and budgets", async () => {
    const today = new Date("2026-11-15T12:00:00Z");
    const summary = await seed(db, today);

    const [user] = await db.select().from(users).where(eq(users.id, summary.userId));
    expect(user?.email).toBe(DEMO_USER.email);
    expect(await bcrypt.compare(DEMO_USER.password, user!.passwordHash)).toBe(true);

    const countOf = async (table: typeof accounts | typeof transactions | typeof budgets) =>
      (await db.select({ n: count() }).from(table))[0]!.n;
    expect(await countOf(accounts)).toBe(summary.accounts);
    expect(await countOf(transactions)).toBe(summary.transactions);
    expect(await countOf(budgets)).toBe(summary.budgets);

    const [range] = await db
      .select({
        first: sql<string>`min(${transactions.occurredOn})::text`,
        last: sql<string>`max(${transactions.occurredOn})::text`,
      })
      .from(transactions);
    expect(range!.first >= "2026-09-01").toBe(true);
    expect(range!.last <= "2026-11-30").toBe(true);
  });

  it("re-seeding replaces the demo data instead of duplicating it", async () => {
    const first = await seed(db);
    const second = await seed(db);

    expect(second.userId).not.toBe(first.userId);
    expect((await db.select({ n: count() }).from(users))[0]!.n).toBe(1);
    expect((await db.select({ n: count() }).from(transactions))[0]!.n).toBe(second.transactions);
  });

  describe("constraints", () => {
    let userId: string;
    let accountId: string;
    let categoryId: string;

    beforeAll(async () => {
      const [user] = await db
        .insert(users)
        .values({ email: "Constraints@Test.dev", name: "C", passwordHash: "x" })
        .returning();
      userId = user!.id;
      const [account] = await db
        .insert(accounts)
        .values({ userId, name: "Wallet", type: "cash" })
        .returning();
      accountId = account!.id;
      const [category] = await db
        .insert(categories)
        .values({ userId, name: "Food", kind: "expense" })
        .returning();
      categoryId = category!.id;
    });

    it("treats emails case-insensitively", async () => {
      await expect(
        db.insert(users).values({ email: "constraints@test.dev", name: "D", passwordHash: "x" }),
      ).rejects.toThrow();
    });

    it("rejects non-positive amounts and invalid budget months", async () => {
      const base = { userId, accountId, kind: "expense" as const, description: "x" };
      await expect(
        db.insert(transactions).values({ ...base, amountCents: 0, occurredOn: "2026-11-01" }),
      ).rejects.toThrow();
      await expect(
        db.insert(budgets).values({ userId, categoryId, month: "2026-11-15", limitCents: 100 }),
      ).rejects.toThrow();
    });

    it("allows one budget per category and month", async () => {
      await db.insert(budgets).values({ userId, categoryId, month: "2026-11-01", limitCents: 100 });
      await expect(
        db.insert(budgets).values({ userId, categoryId, month: "2026-11-01", limitCents: 200 }),
      ).rejects.toThrow();
    });

    it("keeps transactions when their category is deleted", async () => {
      const [transaction] = await db
        .insert(transactions)
        .values({
          userId,
          accountId,
          categoryId,
          kind: "expense",
          amountCents: 1_000,
          description: "Lunch",
          occurredOn: "2026-11-02",
        })
        .returning();

      await db.delete(categories).where(eq(categories.id, categoryId));

      const [after] = await db
        .select()
        .from(transactions)
        .where(eq(transactions.id, transaction!.id));
      expect(after?.categoryId).toBeNull();
    });
  });
});

describe("seed helpers", () => {
  it("generates a deterministic sequence", () => {
    const a = seededRandom(1);
    const b = seededRandom(1);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it("computes month starts across year boundaries", () => {
    const date = new Date("2026-01-20T00:00:00Z");
    expect(monthStart(date)).toBe("2026-01-01");
    expect(monthStart(date, -1)).toBe("2025-12-01");
    expect(monthStart(date, 12)).toBe("2027-01-01");
  });
});
