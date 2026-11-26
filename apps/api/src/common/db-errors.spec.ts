import { isUniqueViolation } from "./db-errors.js";

describe("isUniqueViolation", () => {
  it("recognizes the PostgreSQL code directly or wrapped in `cause`", () => {
    expect(isUniqueViolation({ code: "23505" })).toBe(true);
    expect(isUniqueViolation(new Error("query failed", { cause: { code: "23505" } }))).toBe(true);
  });

  it("ignores other errors", () => {
    expect(isUniqueViolation({ code: "23503" })).toBe(false);
    expect(isUniqueViolation(new Error("boom"))).toBe(false);
    expect(isUniqueViolation(undefined)).toBe(false);
  });
});
