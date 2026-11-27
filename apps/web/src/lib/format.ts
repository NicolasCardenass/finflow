import { formatCents } from "@finflow/shared";

/** All amounts in the UI are shown in BRL with Brazilian formatting. */
export const money = (cents: number) => formatCents(cents);

/** Compact money for chart axes: 123456 cents → "R$ 1,2 mil". */
export function compactMoney(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    notation: "compact",
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(cents / 100);
}

export function percent(value: number, fractionDigits = 0): string {
  return new Intl.NumberFormat("en-US", {
    style: "percent",
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

/** "2026-11" → "November 2026" (or "Nov" with `short`). */
export function formatMonth(month: string, short = false): string {
  const [year, monthIndex] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    month: short ? "short" : "long",
    year: short ? undefined : "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, monthIndex - 1, 1)));
}

/** "YYYY-MM" for the given date (UTC), or shifted by `offset` months. */
export function toYearMonth(date: Date, offset = 0): string {
  const shifted = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + offset, 1));
  return shifted.toISOString().slice(0, 7);
}

/** Shift a "YYYY-MM" month by whole months. */
export function addMonths(month: string, offset: number): string {
  const [year, monthIndex] = month.split("-").map(Number);
  return toYearMonth(new Date(Date.UTC(year, monthIndex - 1, 1)), offset);
}

/**
 * Relative change between two values, or null when there is no baseline.
 * Used for "vs last month" badges.
 */
export function change(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return (current - previous) / Math.abs(previous);
}
