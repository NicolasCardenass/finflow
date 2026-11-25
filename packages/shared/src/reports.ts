import { z } from "zod";
import { yearMonth } from "./budgets.js";
import { isoDate } from "./transactions.js";

export const monthQuerySchema = z.object({ month: yearMonth.optional() });

export const rangeQuerySchema = z
  .object({ from: isoDate, to: isoDate })
  .refine((q) => q.from <= q.to, { message: "`from` must not be after `to`", path: ["from"] });

export const trendQuerySchema = z.object({
  months: z.coerce.number().int().min(1).max(24).default(6),
  until: yearMonth.optional(),
});

export type TotalsDto = {
  incomeCents: number;
  expenseCents: number;
  netCents: number;
};

export type MonthlySummaryDto = TotalsDto & {
  month: string;
  /** Share of income kept, e.g. 0.25 for 25%; null when there was no income. */
  savingsRate: number | null;
  transactionCount: number;
  previousMonth: TotalsDto & { month: string };
};

export type CategorySpendingDto = {
  /** Null groups uncategorized expenses. */
  category: { id: string; name: string; color: string } | null;
  totalCents: number;
  /** Share of the period's expenses, from 0 to 1. */
  share: number;
  transactionCount: number;
};

export type MonthlyTrendPointDto = TotalsDto & { month: string };

/** Round a ratio to 3 decimal places (0.1234 → 0.123). */
export function ratio(part: number, whole: number): number {
  return whole === 0 ? 0 : Math.round((part / whole) * 1000) / 1000;
}
