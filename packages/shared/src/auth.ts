import { z } from "zod";

/** bcrypt only uses the first 72 bytes of a password, so longer ones are rejected. */
const password = z
  .string()
  .min(8, "Password must have at least 8 characters")
  .max(72, "Password must have at most 72 characters");

/** Emails are trimmed and lowercased before validation, so they compare case-insensitively. */
const email = z.string().trim().toLowerCase().pipe(z.email("Invalid email address").max(254));

export const registerSchema = z.object({
  email,
  name: z.string().trim().min(1, "Name is required").max(100),
  password,
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Password is required").max(72),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(20).max(200),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;

export type PublicUser = {
  id: string;
  email: string;
  name: string;
  createdAt: string;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  /** Seconds until the access token expires. */
  expiresIn: number;
  tokenType: "Bearer";
};

export type AuthResponse = AuthTokens & { user: PublicUser };
