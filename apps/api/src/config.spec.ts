import { validateEnv } from "./config.js";

describe("validateEnv", () => {
  it("applies defaults", () => {
    expect(validateEnv({})).toEqual({
      NODE_ENV: "development",
      PORT: 3333,
      CORS_ORIGINS: ["http://localhost:3000"],
    });
  });

  it("parses the port and a comma-separated origin list", () => {
    const env = validateEnv({ PORT: "8080", CORS_ORIGINS: "http://a.test, http://b.test," });

    expect(env.PORT).toBe(8080);
    expect(env.CORS_ORIGINS).toEqual(["http://a.test", "http://b.test"]);
  });

  it("rejects invalid values with a readable message", () => {
    expect(() => validateEnv({ PORT: "not-a-port" })).toThrow(/Invalid environment variables/);
    expect(() => validateEnv({ NODE_ENV: "staging" })).toThrow(/NODE_ENV/);
  });
});
