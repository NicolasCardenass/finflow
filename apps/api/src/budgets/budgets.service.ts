import {
  budgetStatus,
  type BudgetDto,
  type CreateBudgetInput,
  type UpdateBudgetInput,
} from "@finflow/shared";
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { and, asc, eq, gte, lt, sql } from "drizzle-orm";
import { isUniqueViolation } from "../common/db-errors.js";
import type { Database } from "../database/client.js";
import { DATABASE } from "../database/database.module.js";
import { budgets, categories, transactions } from "../database/schema.js";

/** "2026-11" → ["2026-11-01", "2026-12-01"]: the half-open date range of the month. */
export function monthRange(month: string): [string, string] {
  const [year, monthNumber] = month.split("-").map(Number) as [number, number];
  const next = new Date(Date.UTC(year, monthNumber, 1)).toISOString().slice(0, 10);
  return [`${month}-01`, next];
}

export function currentMonth(today = new Date()): string {
  return today.toISOString().slice(0, 7);
}

@Injectable()
export class BudgetsService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  /** Budgets of a month with how much of each limit was already spent. */
  async list(userId: string, month = currentMonth()): Promise<BudgetDto[]> {
    const [start, end] = monthRange(month);
    // Spending is aggregated in a subquery so each budget row is joined once.
    const spent = this.db
      .select({
        categoryId: transactions.categoryId,
        spentCents: sql<string>`sum(${transactions.amountCents})`.as("spent_cents"),
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.kind, "expense"),
          gte(transactions.occurredOn, start),
          lt(transactions.occurredOn, end),
        ),
      )
      .groupBy(transactions.categoryId)
      .as("spent");

    const rows = await this.db
      .select({
        id: budgets.id,
        month: budgets.month,
        limitCents: budgets.limitCents,
        categoryId: categories.id,
        categoryName: categories.name,
        categoryColor: categories.color,
        spentCents: sql<string>`coalesce(${spent.spentCents}, 0)`,
      })
      .from(budgets)
      .innerJoin(categories, eq(categories.id, budgets.categoryId))
      .leftJoin(spent, eq(spent.categoryId, budgets.categoryId))
      .where(and(eq(budgets.userId, userId), eq(budgets.month, start)))
      .orderBy(asc(categories.name));

    return rows.map((row) => {
      const spentCents = Number(row.spentCents);
      return {
        id: row.id,
        month: row.month.slice(0, 7),
        category: { id: row.categoryId, name: row.categoryName, color: row.categoryColor },
        limitCents: row.limitCents,
        spentCents,
        remainingCents: row.limitCents - spentCents,
        usage: Math.round((spentCents / row.limitCents) * 1000) / 1000,
        status: budgetStatus(spentCents, row.limitCents),
      };
    });
  }

  /** Budgets of the month that need attention (warning or exceeded), worst first. */
  async alerts(userId: string, month = currentMonth()): Promise<BudgetDto[]> {
    const all = await this.list(userId, month);
    return all.filter((budget) => budget.status !== "ok").sort((a, b) => b.usage - a.usage);
  }

  async create(userId: string, input: CreateBudgetInput): Promise<BudgetDto> {
    const [category] = await this.db
      .select({ kind: categories.kind })
      .from(categories)
      .where(and(eq(categories.userId, userId), eq(categories.id, input.categoryId)));
    if (!category) throw new BadRequestException("Category not found");
    if (category.kind !== "expense") {
      throw new UnprocessableEntityException("Budgets can only be set for expense categories");
    }

    try {
      const [created] = await this.db
        .insert(budgets)
        .values({
          userId,
          categoryId: input.categoryId,
          month: monthRange(input.month)[0],
          limitCents: input.limitCents,
        })
        .returning({ id: budgets.id });
      return this.get(userId, created!.id, input.month);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException("This category already has a budget for that month");
      }
      throw error;
    }
  }

  async update(userId: string, id: string, input: UpdateBudgetInput): Promise<BudgetDto> {
    const [updated] = await this.db
      .update(budgets)
      .set({ limitCents: input.limitCents })
      .where(and(eq(budgets.userId, userId), eq(budgets.id, id)))
      .returning({ month: budgets.month });
    if (!updated) throw new NotFoundException("Budget not found");
    return this.get(userId, id, updated.month.slice(0, 7));
  }

  async remove(userId: string, id: string): Promise<void> {
    const [deleted] = await this.db
      .delete(budgets)
      .where(and(eq(budgets.userId, userId), eq(budgets.id, id)))
      .returning({ id: budgets.id });
    if (!deleted) throw new NotFoundException("Budget not found");
  }

  private async get(userId: string, id: string, month: string): Promise<BudgetDto> {
    const budget = (await this.list(userId, month)).find((b) => b.id === id);
    if (!budget) throw new NotFoundException("Budget not found");
    return budget;
  }
}
