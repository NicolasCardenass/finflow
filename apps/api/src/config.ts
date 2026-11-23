import { z } from "zod";

/** Environment variables, validated once at startup (the app refuses to boot if invalid). */
export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65_535).default(3333),
  DATABASE_URL: z
    .url({ protocol: /^postgres(ql)?$/ })
    .default("postgres://finflow:finflow@localhost:5432/finflow"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must have at least 32 characters").optional(),
  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().min(60).max(86_400).default(900),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(365).default(30),
  CORS_ORIGINS: z
    .string()
    .default("http://localhost:3000")
    .transform((value) =>
      value
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),
});

/** Development-only fallback, so the API runs out of the box; production must set its own. */
const DEV_JWT_SECRET = "dev-only-insecure-jwt-secret-change-me-0000";

export type Env = Omit<z.infer<typeof envSchema>, "JWT_SECRET"> & { JWT_SECRET: string };

export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    throw new Error(`Invalid environment variables:\n${z.prettifyError(result.error)}`);
  }
  const { JWT_SECRET, ...env } = result.data;
  if (!JWT_SECRET && env.NODE_ENV === "production") {
    throw new Error("Invalid environment variables:\n✖ JWT_SECRET is required in production");
  }
  return { ...env, JWT_SECRET: JWT_SECRET ?? DEV_JWT_SECRET };
}
