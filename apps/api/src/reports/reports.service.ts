import {
  ratio,
  type CategorySpendingDto,
  type MonthlySummaryDto,
  type MonthlyTrendPointDto,
  type TotalsDto,
} from "@finflow/shared";
import { Inject, Injectable } from "@nestjs/common";
import { and, desc, eq, gte, lt, lte, sql } from "drizzle-orm";
import { currentMonth, monthRange } from "../budgets/budgets.service.js";
import type { Database } from "../database/client.js";
import { DATABASE } from "../database/database.module.js";
import { categories, transactions } from "../database/schema.js";

const income = sql<string>`coalesce(sum(${transactions.amountCents}) filter (where ${transactions.kind} = 'income'), 0)`;
const expense = sql<string>`coalesce(sum(${transactions.amountCents}) filter (where ${transactions.kind} = 'expense'), 0)`;

function totals(row: { income: string; expense: string } | undefined): TotalsDto {
  const incomeCents = Number(row?.income ?? 0);
  const expenseCents = Number(row?.expense ?? 0);
  return { incomeCents, expenseCents, netCents: incomeCents - expenseCents };
}

/** "2026-11" shifted by `offset` months, e.g. ("2026-01", -1) → "2025-12". */
export function shiftMonth(month: string, offset: number): string {
  const [year, monthNumber] = month.split("-").map(Number) as [number, number];
  return new Date(Date.UTC(year, monthNumber - 1 + offset, 1)).toISOString().slice(0, 7);
}

@Injectable()
export class ReportsService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  /** Income, expenses, net result and savings rate of a month, compared with the previous one. */
  async monthlySummary(userId: string, month = currentMonth()): Promise<MonthlySummaryDto> {
    const previous = shiftMonth(month, -1);
    const [start] = monthRange(previous);
    const [, end] = monthRange(month);
    const monthStart = `${month}-01`;

    // One pass over both months; FILTER splits the sums per month and kind.
    const [row] = await this.db
      .select({
        income: sql<string>`coalesce(sum(${transactions.amountCents}) filter (where ${transactions.kind} = 'income' and ${transactions.occurredOn} >= ${monthStart}), 0)`,
        expense: sql<string>`coalesce(sum(${transactions.amountCents}) filter (where ${transactions.kind} = 'expense' and ${transactions.occurredOn} >= ${monthStart}), 0)`,
        count: sql<number>`(count(*) filter (where ${transactions.occurredOn} >= ${monthStart}))::int`,
        previousIncome: sql<string>`coalesce(sum(${transactions.amountCents}) filter (where ${transactions.kind} = 'income' and ${transactions.occurredOn} < ${monthStart}), 0)`,
        previousExpense: sql<string>`coalesce(sum(${transactions.amountCents}) filter (where ${transactions.kind} = 'expense' and ${transactions.occurredOn} < ${monthStart}), 0)`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          gte(transactions.occurredOn, start),
          lt(transactions.occurredOn, end),
        ),
      );

    const current = totals(row);
    return {
      month,
      ...current,
      savingsRate: current.incomeCents > 0 ? ratio(current.netCents, current.incomeCents) : null,
      transactionCount: row?.count ?? 0,
      previousMonth: {
        month: previous,
        ...totals({ income: row?.previousIncome ?? "0", expense: row?.previousExpense ?? "0" }),
      },
    };
  }

  /** Expenses of a date range grouped by category, largest first. */
  async spendingByCategory(
    userId: string,
    from: string,
    to: string,
  ): Promise<CategorySpendingDto[]> {
    const total = sql<string>`sum(${transactions.amountCents})`;
    const rows = await this.db
      .select({
        categoryId: categories.id,
        name: categories.name,
        color: categories.color,
        total,
        count: sql<number>`count(*)::int`,
      })
      .from(transactions)
      .leftJoin(categories, eq(categories.id, transactions.categoryId))
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.kind, "expense"),
          gte(transactions.occurredOn, from),
          lte(transactions.occurredOn, to),
        ),
      )
      .groupBy(categories.id)
      .orderBy(desc(total));

    const grandTotal = rows.reduce((sum, row) => sum + Number(row.total), 0);
    return rows.map((row) => ({
      category:
        row.categoryId && row.name && row.color
          ? { id: row.categoryId, name: row.name, color: row.color }
          : null,
      totalCents: Number(row.total),
      share: ratio(Number(row.total), grandTotal),
      transactionCount: row.count,
    }));
  }

  /** Income, expenses and net result for each of the last `months` months (oldest first). */
  async monthlyTrend(
    userId: string,
    months: number,
    until = currentMonth(),
  ): Promise<MonthlyTrendPointDto[]> {
    const first = shiftMonth(until, -(months - 1));
    const [start] = monthRange(first);
    const [, end] = monthRange(until);
    const monthKey = sql<string>`to_char(${transactions.occurredOn}, 'YYYY-MM')`;

    const rows = await this.db
      .select({ month: monthKey, income, expense })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          gte(transactions.occurredOn, start),
          lt(transactions.occurredOn, end),
        ),
      )
      .groupBy(monthKey);
    const byMonth = new Map(rows.map((row) => [row.month, row]));

    // Months without transactions still appear, with zeros, so charts have no gaps.
    return Array.from({ length: months }, (_, index) => {
      const month = shiftMonth(first, index);
      return { month, ...totals(byMonth.get(month)) };
    });
  }
}
