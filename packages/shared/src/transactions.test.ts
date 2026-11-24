import { describe, expect, it } from "vitest";
import {
  createTransactionSchema,
  listTransactionsQuerySchema,
  updateTransactionSchema,
} from "./transactions.js";

const base = {
  accountId: "6f1c4ad8-2a4f-4b7e-9d8e-0f1b2c3d4e5f",
  kind: "expense",
  amountCents: 1999,
  description: "  Coffee ",
  occurredOn: "2026-11-24",
};

describe("createTransactionSchema", () => {
  it("trims text and defaults optional fields to null", () => {
    expect(createTransactionSchema.parse(base)).toEqual({
      ...base,
      description: "Coffee",
      categoryId: null,
      notes: null,
    });
  });

  it.each([
    [{ amountCents: 0 }, "positive"],
    [{ amountCents: 10.5 }, "integer cents"],
    [{ occurredOn: "2026-02-30" }, "YYYY-MM-DD"],
    [{ occurredOn: "24/11/2026" }, "YYYY-MM-DD"],
    [{ accountId: "nope" }, "UUID"],
  ])("rejects %j", (override, message) => {
    const result = createTransactionSchema.safeParse({ ...base, ...override });
    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error?.issues)).toMatch(new RegExp(message, "i"));
  });
});

describe("updateTransactionSchema", () => {
  it("keeps omitted fields untouched", () => {
    expect(updateTransactionSchema.parse({ amountCents: 500 })).toEqual({ amountCents: 500 });
  });
});

describe("listTransactionsQuerySchema", () => {
  it("coerces query strings and applies defaults", () => {
    expect(listTransactionsQuerySchema.parse({ page: "2", pageSize: "50" })).toEqual({
      page: 2,
      pageSize: 50,
      sort: "date_desc",
    });
  });

  it("rejects inverted date ranges and oversized pages", () => {
    expect(
      listTransactionsQuerySchema.safeParse({ from: "2026-12-01", to: "2026-11-01" }).success,
    ).toBe(false);
    expect(listTransactionsQuerySchema.safeParse({ pageSize: "500" }).success).toBe(false);
  });
});
