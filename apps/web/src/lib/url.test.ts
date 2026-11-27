import { describe, expect, it } from "vitest";
import { pageWindow, toQueryString } from "./url";

describe("toQueryString", () => {
  it("skips empty values and encodes the rest", () => {
    expect(toQueryString({ search: "café & bar", page: 2, kind: undefined, from: "" })).toBe(
      "?search=caf%C3%A9+%26+bar&page=2",
    );
  });

  it("returns an empty string when there are no values", () => {
    expect(toQueryString({ search: null })).toBe("");
  });
});

describe("pageWindow", () => {
  it("lists every page when there are few", () => {
    expect(pageWindow(2, 3)).toEqual([1, 2, 3]);
  });

  it("collapses distant pages into gaps", () => {
    expect(pageWindow(6, 12)).toEqual([1, null, 5, 6, 7, null, 12]);
    expect(pageWindow(1, 12)).toEqual([1, 2, null, 12]);
  });

  it("handles an empty result", () => {
    expect(pageWindow(1, 0)).toEqual([]);
  });
});
