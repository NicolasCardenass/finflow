import { validateEnv } from "./config.js";

describe("validateEnv", () => {
  it("applies defaults", () => {
    expect(validateEnv({})).toMatchObject({
      NODE_ENV: "development",
      PORT: 3333,
      DATABASE_URL: "postgres://finflow:finflow@localhost:5432/finflow",
      CORS_ORIGINS: ["http://localhost:3000"],
      ACCESS_TOKEN_TTL_SECONDS: 900,
      REFRESH_TOKEN_TTL_DAYS: 30,
    });
  });

  it("uses a development JWT secret only outside production", () => {
    expect(validateEnv({}).JWT_SECRET.length).toBeGreaterThanOrEqual(32);
    expect(() => validateEnv({ NODE_ENV: "production" })).toThrow(/JWT_SECRET is required/);
    expect(() => validateEnv({ JWT_SECRET: "too-short" })).toThrow(/at least 32/);

    const secret = "x".repeat(40);
    expect(validateEnv({ NODE_ENV: "production", JWT_SECRET: secret }).JWT_SECRET).toBe(secret);
  });

  it("parses the port and a comma-separated origin list", () => {
    const env = validateEnv({ PORT: "8080", CORS_ORIGINS: "http://a.test, http://b.test," });

    expect(env.PORT).toBe(8080);
    expect(env.CORS_ORIGINS).toEqual(["http://a.test", "http://b.test"]);
  });

  it("rejects invalid values with a readable message", () => {
    expect(() => validateEnv({ PORT: "not-a-port" })).toThrow(/Invalid environment variables/);
    expect(() => validateEnv({ NODE_ENV: "staging" })).toThrow(/NODE_ENV/);
    expect(() => validateEnv({ DATABASE_URL: "mysql://localhost/db" })).toThrow(/DATABASE_URL/);
  });
});
