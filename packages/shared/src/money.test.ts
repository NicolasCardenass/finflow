import { describe, expect, it } from "vitest";
import { formatCents, toCents } from "./money.js";

describe("toCents", () => {
  it.each([
    ["100", 10000],
    ["12.5", 1250],
    ["12,05", 1205],
    ["-3.40", -340],
    ["0", 0],
    [" 7.99 ", 799],
  ])("parses %j as %i cents", (input, expected) => {
    expect(toCents(input)).toBe(expected);
  });

  it.each(["", "abc", "1.234", "1e3", "--1", "1.2.3"])("rejects %j", (input) => {
    expect(() => toCents(input)).toThrow("Invalid amount");
  });

  it("avoids floating-point drift", () => {
    expect(toCents("0.1") + toCents("0.2")).toBe(toCents("0.3"));
  });
});

describe("formatCents", () => {
  it("formats Brazilian reais by default", () => {
    expect(formatCents(123456).replace(/\s/g, " ")).toBe("R$ 1.234,56");
  });

  it("supports other currencies and locales", () => {
    expect(formatCents(-500, "USD", "en-US")).toBe("-$5.00");
  });
});
