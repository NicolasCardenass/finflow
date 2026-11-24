import { z } from "zod";

/** A calendar month as YYYY-MM. */
export const yearMonth = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Months must use the YYYY-MM format");

const limitCents = z
  .number()
  .int("Amounts are integer cents")
  .positive("Limit must be positive")
  .max(10_000_000_000);

export const createBudgetSchema = z.object({
  categoryId: z.uuid(),
  month: yearMonth,
  limitCents,
});

export const updateBudgetSchema = z.object({ limitCents });

export const budgetsQuerySchema = z.object({ month: yearMonth.optional() });

export type CreateBudgetInput = z.infer<typeof createBudgetSchema>;
export type UpdateBudgetInput = z.infer<typeof updateBudgetSchema>;

/** `warning` from this share of the limit; `exceeded` above 100%. */
export const BUDGET_WARNING_RATIO = 0.8;

export type BudgetStatus = "ok" | "warning" | "exceeded";

export function budgetStatus(spentCents: number, limitCents: number): BudgetStatus {
  if (spentCents > limitCents) return "exceeded";
  if (spentCents >= limitCents * BUDGET_WARNING_RATIO) return "warning";
  return "ok";
}

export type BudgetDto = {
  id: string;
  month: string;
  category: { id: string; name: string; color: string };
  limitCents: number;
  spentCents: number;
  remainingCents: number;
  /** Share of the limit already spent, e.g. 0.85 for 85%. */
  usage: number;
  status: BudgetStatus;
};
