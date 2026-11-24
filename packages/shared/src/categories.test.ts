import { describe, expect, it } from "vitest";
import { createCategorySchema, DEFAULT_CATEGORIES, updateCategorySchema } from "./categories.js";

describe("category schemas", () => {
  it("defaults and normalizes the color", () => {
    expect(createCategorySchema.parse({ name: "Pets", kind: "expense" }).color).toBe("#64748b");
    expect(
      createCategorySchema.parse({ name: "Pets", kind: "expense", color: "#AABBCC" }).color,
    ).toBe("#aabbcc");
  });

  it("rejects invalid colors and kind changes", () => {
    expect(
      createCategorySchema.safeParse({ name: "X", kind: "expense", color: "red" }).success,
    ).toBe(false);
    expect(updateCategorySchema.parse({ name: "Y", kind: "income" })).toEqual({ name: "Y" });
    expect(updateCategorySchema.safeParse({}).success).toBe(false);
  });

  it("ships valid default categories with unique names per kind", () => {
    for (const category of DEFAULT_CATEGORIES) {
      expect(createCategorySchema.safeParse(category).success).toBe(true);
    }
    const keys = DEFAULT_CATEGORIES.map((c) => `${c.kind}:${c.name}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
