import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  date,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

/*
 * Money columns store integer cents as BIGINT, read as JavaScript numbers
 * (safe up to ±90 trillion reais, far beyond personal finance amounts).
 */
const cents = (name: string) => bigint(name, { mode: "number" });

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

export const accountType = pgEnum("account_type", [
  "checking",
  "savings",
  "credit_card",
  "cash",
  "investment",
]);

export const entryKind = pgEnum("entry_kind", ["income", "expense"]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 254 }).notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    passwordHash: text("password_hash").notNull(),
    ...timestamps,
  },
  (table) => [
    // Emails are compared case-insensitively.
    uniqueIndex("users_email_unique").on(sql`lower(${table.email})`),
  ],
);

export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 60 }).notNull(),
    type: accountType("type").notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("BRL"),
    initialBalanceCents: cents("initial_balance_cents").notNull().default(0),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("accounts_user_name_unique").on(table.userId, table.name),
    check("accounts_currency_format", sql`${table.currency} ~ '^[A-Z]{3}$'`),
  ],
);

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 40 }).notNull(),
    kind: entryKind("kind").notNull(),
    color: varchar("color", { length: 7 }).notNull().default("#64748b"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("categories_user_name_kind_unique").on(table.userId, table.name, table.kind),
    check("categories_color_hex", sql`${table.color} ~ '^#[0-9a-fA-F]{6}$'`),
  ],
);

export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
    kind: entryKind("kind").notNull(),
    /** Always positive; the kind says whether money comes in or goes out. */
    amountCents: cents("amount_cents").notNull(),
    description: varchar("description", { length: 140 }).notNull(),
    occurredOn: date("occurred_on", { mode: "string" }).notNull(),
    notes: text("notes"),
    ...timestamps,
  },
  (table) => [
    check("transactions_amount_positive", sql`${table.amountCents} > 0`),
    index("transactions_user_date_idx").on(table.userId, table.occurredOn),
    index("transactions_account_idx").on(table.accountId),
    index("transactions_category_idx").on(table.categoryId),
  ],
);

export const budgets = pgTable(
  "budgets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    /** First day of the budget's month, e.g. 2026-11-01. */
    month: date("month", { mode: "string" }).notNull(),
    limitCents: cents("limit_cents").notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("budgets_user_category_month_unique").on(
      table.userId,
      table.categoryId,
      table.month,
    ),
    check("budgets_limit_positive", sql`${table.limitCents} > 0`),
    check("budgets_month_first_day", sql`extract(day from ${table.month}) = 1`),
  ],
);

export type User = typeof users.$inferSelect;
export type Account = typeof accounts.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type Budget = typeof budgets.$inferSelect;
