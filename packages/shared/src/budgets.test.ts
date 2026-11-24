import { describe, expect, it } from "vitest";
import { budgetStatus, createBudgetSchema } from "./budgets.js";

describe("budgetStatus", () => {
  it.each([
    [0, 1000, "ok"],
    [799, 1000, "ok"],
    [800, 1000, "warning"],
    [1000, 1000, "warning"],
    [1001, 1000, "exceeded"],
  ] as const)("spent %i of %i is %s", (spent, limit, status) => {
    expect(budgetStatus(spent, limit)).toBe(status);
  });
});

describe("createBudgetSchema", () => {
  const base = { categoryId: "6f1c4ad8-2a4f-4b7e-9d8e-0f1b2c3d4e5f", limitCents: 50_000 };

  it("accepts YYYY-MM months only", () => {
    expect(createBudgetSchema.safeParse({ ...base, month: "2026-11" }).success).toBe(true);
    for (const month of ["2026-13", "2026-1", "2026-11-01", "11/2026"]) {
      expect(createBudgetSchema.safeParse({ ...base, month }).success).toBe(false);
    }
  });
});
