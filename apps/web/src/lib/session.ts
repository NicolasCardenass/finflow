import "server-only";
import type { AuthTokens } from "@finflow/shared";
import { cookies } from "next/headers";
import { IS_PRODUCTION } from "./env";

/**
 * Tokens live in httpOnly cookies: JavaScript in the browser can never read
 * them, which protects them from XSS. The Next.js server attaches the access
 * token to API calls on the user's behalf (a "backend for frontend").
 */
export const ACCESS_COOKIE = "ff_access";
export const REFRESH_COOKIE = "ff_refresh";
const REFRESH_MAX_AGE = 30 * 24 * 60 * 60;

const base = {
  httpOnly: true,
  secure: IS_PRODUCTION,
  sameSite: "lax" as const,
  path: "/",
};

/** Must run in a Server Action or Route Handler (the only places cookies can be set). */
export async function saveSession(tokens: AuthTokens): Promise<void> {
  const store = await cookies();
  store.set(ACCESS_COOKIE, tokens.accessToken, { ...base, maxAge: tokens.expiresIn });
  store.set(REFRESH_COOKIE, tokens.refreshToken, { ...base, maxAge: REFRESH_MAX_AGE });
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(ACCESS_COOKIE);
  store.delete(REFRESH_COOKIE);
}

export async function readSession(): Promise<{ accessToken?: string; refreshToken?: string }> {
  const store = await cookies();
  return {
    accessToken: store.get(ACCESS_COOKIE)?.value,
    refreshToken: store.get(REFRESH_COOKIE)?.value,
  };
}
