import bcrypt from "bcryptjs";
import { eq, sql } from "drizzle-orm";
import type { Database } from "./client.js";
import { accounts, budgets, categories, transactions, users } from "./schema.js";
import {
  DEMO_ACCOUNTS,
  DEMO_BUDGETS,
  DEMO_CATEGORIES,
  DEMO_USER,
  monthStart,
  seededRandom,
} from "./seed-data.js";

type Expense = { category: string; description: string; min: number; max: number; times: number };

const MONTHLY_EXPENSES: Expense[] = [
  { category: "Groceries", description: "Supermarket", min: 8_000, max: 35_000, times: 4 },
  { category: "Restaurants", description: "Restaurant", min: 3_000, max: 12_000, times: 3 },
  { category: "Transport", description: "Ride / fuel", min: 1_500, max: 9_000, times: 5 },
  {
    category: "Utilities",
    description: "Electricity and internet",
    min: 18_000,
    max: 26_000,
    times: 1,
  },
  { category: "Leisure", description: "Cinema / games", min: 2_000, max: 10_000, times: 2 },
];

export type SeedSummary = {
  userId: string;
  accounts: number;
  transactions: number;
  budgets: number;
};

/**
 * Reset and create the demo user with three months of data. Safe to run
 * repeatedly: the previous demo user is deleted first (cascading to its data).
 */
export async function seed(db: Database, today = new Date()): Promise<SeedSummary> {
  const random = seededRandom(42);
  const between = (min: number, max: number) => Math.round(min + random() * (max - min));

  return db.transaction(async (tx) => {
    await tx.delete(users).where(eq(sql`lower(${users.email})`, DEMO_USER.email));

    const [user] = await tx
      .insert(users)
      .values({
        email: DEMO_USER.email,
        name: DEMO_USER.name,
        passwordHash: await bcrypt.hash(DEMO_USER.password, 10),
      })
      .returning({ id: users.id });
    if (!user) throw new Error("Failed to create the demo user");

    const accountRows = await tx
      .insert(accounts)
      .values(DEMO_ACCOUNTS.map((account) => ({ ...account, userId: user.id })))
      .returning({ id: accounts.id, name: accounts.name });
    const categoryRows = await tx
      .insert(categories)
      .values(DEMO_CATEGORIES.map((category) => ({ ...category, userId: user.id })))
      .returning({ id: categories.id, name: categories.name });

    const accountId = (name: string) => accountRows.find((a) => a.name === name)!.id;
    const categoryId = (name: string) => categoryRows.find((c) => c.name === name)!.id;

    const rows: (typeof transactions.$inferInsert)[] = [];
    for (const offset of [-2, -1, 0]) {
      const month = monthStart(today, offset);
      const day = (n: number) => `${month.slice(0, 8)}${String(n).padStart(2, "0")}`;
      rows.push(
        {
          userId: user.id,
          accountId: accountId("Main checking"),
          categoryId: categoryId("Salary"),
          kind: "income",
          amountCents: 650_000,
          description: "Monthly salary",
          occurredOn: day(5),
        },
        {
          userId: user.id,
          accountId: accountId("Main checking"),
          categoryId: categoryId("Rent"),
          kind: "expense",
          amountCents: 180_000,
          description: "Apartment rent",
          occurredOn: day(10),
        },
      );
      if (random() > 0.4) {
        rows.push({
          userId: user.id,
          accountId: accountId("Main checking"),
          categoryId: categoryId("Freelance"),
          kind: "income",
          amountCents: between(50_000, 200_000),
          description: "Freelance project",
          occurredOn: day(between(12, 25)),
        });
      }
      for (const expense of MONTHLY_EXPENSES) {
        for (let i = 0; i < expense.times; i++) {
          rows.push({
            userId: user.id,
            accountId: accountId(random() > 0.5 ? "Credit card" : "Main checking"),
            categoryId: categoryId(expense.category),
            kind: "expense",
            amountCents: between(expense.min, expense.max),
            description: expense.description,
            occurredOn: day(between(1, 28)),
          });
        }
      }
    }
    await tx.insert(transactions).values(rows);

    const month = monthStart(today);
    const budgetRows = await tx
      .insert(budgets)
      .values(
        Object.entries(DEMO_BUDGETS).map(([category, limitCents]) => ({
          userId: user.id,
          categoryId: categoryId(category),
          month,
          limitCents,
        })),
      )
      .returning({ id: budgets.id });

    return {
      userId: user.id,
      accounts: accountRows.length,
      transactions: rows.length,
      budgets: budgetRows.length,
    };
  });
}
