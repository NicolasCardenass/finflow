import { describe, expect, it } from "vitest";
import { createAccountSchema, updateAccountSchema } from "./accounts.js";

describe("createAccountSchema", () => {
  it("applies defaults and normalizes the currency", () => {
    expect(createAccountSchema.parse({ name: " Wallet ", type: "cash", currency: "usd" })).toEqual({
      name: "Wallet",
      type: "cash",
      currency: "USD",
      initialBalanceCents: 0,
    });
  });

  it("rejects fractional cents and unknown types", () => {
    expect(
      createAccountSchema.safeParse({ name: "A", type: "cash", initialBalanceCents: 10.5 }).success,
    ).toBe(false);
    expect(createAccountSchema.safeParse({ name: "A", type: "crypto" }).success).toBe(false);
  });
});

describe("updateAccountSchema", () => {
  it("accepts partial updates but not empty ones", () => {
    expect(updateAccountSchema.parse({ archived: true })).toEqual({ archived: true });
    expect(updateAccountSchema.safeParse({}).success).toBe(false);
  });

  it("does not allow changing the currency", () => {
    expect(updateAccountSchema.parse({ name: "B", currency: "USD" })).toEqual({ name: "B" });
  });
});
