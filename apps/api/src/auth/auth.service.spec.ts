import { hashToken } from "./auth.service.js";

describe("hashToken", () => {
  it("returns a stable SHA-256 hex digest that hides the token", () => {
    const digest = hashToken("some-refresh-token");

    expect(digest).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken("some-refresh-token")).toBe(digest);
    expect(hashToken("some-refresh-tokem")).not.toBe(digest);
    expect(digest).not.toContain("refresh");
  });
});
