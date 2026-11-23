/** Demo data: deterministic, so every seed produces the same dataset. */

export const DEMO_USER = {
  email: "demo@finflow.dev",
  name: "Demo User",
  password: "demo1234",
} as const;

export const DEMO_ACCOUNTS = [
  { name: "Main checking", type: "checking", initialBalanceCents: 250_000 },
  { name: "Savings", type: "savings", initialBalanceCents: 1_000_000 },
  { name: "Credit card", type: "credit_card", initialBalanceCents: 0 },
] as const;

export const DEMO_CATEGORIES = [
  { name: "Salary", kind: "income", color: "#16a34a" },
  { name: "Freelance", kind: "income", color: "#22c55e" },
  { name: "Rent", kind: "expense", color: "#dc2626" },
  { name: "Groceries", kind: "expense", color: "#f97316" },
  { name: "Restaurants", kind: "expense", color: "#eab308" },
  { name: "Transport", kind: "expense", color: "#3b82f6" },
  { name: "Utilities", kind: "expense", color: "#8b5cf6" },
  { name: "Leisure", kind: "expense", color: "#ec4899" },
] as const;

/** Monthly budgets (in cents) for the current month. */
export const DEMO_BUDGETS: Record<string, number> = {
  Groceries: 120_000,
  Restaurants: 40_000,
  Transport: 30_000,
  Leisure: 25_000,
};

/** Small deterministic pseudo-random generator (mulberry32). */
export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

/** First day of the month `offset` months from `reference`, as YYYY-MM-DD. */
export function monthStart(reference: Date, offset = 0): string {
  const date = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth() + offset, 1));
  return date.toISOString().slice(0, 10);
}
