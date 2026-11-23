import { describe, expect, it } from "vitest";
import { loginSchema, registerSchema } from "./auth.js";

describe("registerSchema", () => {
  it("normalizes the email and trims the name", () => {
    const parsed = registerSchema.parse({
      email: "  Ana@Example.COM ",
      name: "  Ana  ",
      password: "s3cret-pass",
    });

    expect(parsed).toEqual({ email: "ana@example.com", name: "Ana", password: "s3cret-pass" });
  });

  it.each([
    [{ email: "not-an-email", name: "A", password: "12345678" }, "Invalid email"],
    [{ email: "a@b.co", name: " ", password: "12345678" }, "Name is required"],
    [{ email: "a@b.co", name: "A", password: "short" }, "at least 8"],
    [{ email: "a@b.co", name: "A", password: "x".repeat(73) }, "at most 72"],
  ])("rejects invalid input %#", (input, message) => {
    const result = registerSchema.safeParse(input);
    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error?.issues)).toContain(message);
  });
});

describe("loginSchema", () => {
  it("accepts any non-empty password", () => {
    expect(loginSchema.parse({ email: "A@b.co", password: "x" })).toEqual({
      email: "a@b.co",
      password: "x",
    });
  });
});
