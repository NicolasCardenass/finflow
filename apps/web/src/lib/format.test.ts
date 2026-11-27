import { describe, expect, it } from "vitest";
import {
  addMonths,
  change,
  compactMoney,
  formatMonth,
  money,
  percent,
  toYearMonth,
} from "./format";

const normalize = (value: string) => value.replace(/\s/g, " ");

describe("format helpers", () => {
  it("formats cents as BRL", () => {
    expect(normalize(money(123456))).toBe("R$ 1.234,56");
    expect(normalize(money(-500))).toBe("-R$ 5,00");
  });

  it("formats compact amounts for chart axes", () => {
    expect(normalize(compactMoney(150_000_00))).toBe("R$ 150 mil");
  });

  it("formats percentages", () => {
    expect(percent(0.256)).toBe("26%");
    expect(percent(0.256, 1)).toBe("25.6%");
  });

  it("formats months in long and short form", () => {
    expect(formatMonth("2026-11")).toBe("November 2026");
    expect(formatMonth("2026-01", true)).toBe("Jan");
  });

  it("shifts months across year boundaries", () => {
    expect(addMonths("2026-01", -1)).toBe("2025-12");
    expect(addMonths("2026-12", 1)).toBe("2027-01");
    expect(toYearMonth(new Date("2026-03-31T12:00:00Z"), -1)).toBe("2026-02");
  });

  it("computes relative change against a baseline", () => {
    expect(change(150, 100)).toBe(0.5);
    expect(change(50, -100)).toBe(1.5);
    expect(change(10, 0)).toBeNull();
  });
});
