import { shiftMonth } from "./reports.service.js";

describe("shiftMonth", () => {
  it.each([
    ["2026-11", -1, "2026-10"],
    ["2026-01", -1, "2025-12"],
    ["2026-11", 2, "2027-01"],
    ["2026-06", -17, "2025-01"],
  ])("%s %+d → %s", (month, offset, expected) => {
    expect(shiftMonth(month, offset)).toBe(expected);
  });
});
