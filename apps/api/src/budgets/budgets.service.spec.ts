import { currentMonth, monthRange } from "./budgets.service.js";

describe("monthRange", () => {
  it.each([
    ["2026-11", ["2026-11-01", "2026-12-01"]],
    ["2026-12", ["2026-12-01", "2027-01-01"]],
    ["2028-02", ["2028-02-01", "2028-03-01"]],
  ])("%s spans %j", (month, range) => {
    expect(monthRange(month)).toEqual(range);
  });
});

describe("currentMonth", () => {
  it("formats the month as YYYY-MM", () => {
    expect(currentMonth(new Date("2026-01-31T12:00:00Z"))).toBe("2026-01");
  });
});
