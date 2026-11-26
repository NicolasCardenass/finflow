import type { AuthTokens } from "@finflow/shared";
import { NextResponse, type NextRequest } from "next/server";
import { publicApi } from "@/lib/api";
import { clearSession, readSession, saveSession } from "@/lib/session";

/** Only same-site paths are allowed as return targets (no open redirects). */
function safePath(value: string | null): string {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/dashboard";
}

/**
 * Renew the token pair with the refresh token cookie, then return to the page
 * that needed it. Server Components redirect here because only Route Handlers
 * and Server Actions can write cookies.
 */
export async function GET(request: NextRequest) {
  const next = safePath(request.nextUrl.searchParams.get("next"));
  const { refreshToken } = await readSession();

  if (refreshToken) {
    try {
      const tokens = await publicApi<AuthTokens>("/auth/refresh", {
        method: "POST",
        body: JSON.stringify({ refreshToken }),
      });
      await saveSession(tokens);
      return NextResponse.redirect(new URL(next, request.url));
    } catch {
      // Expired, revoked or reused: fall through to a fresh sign-in.
    }
  }
  await clearSession();
  return NextResponse.redirect(new URL("/login", request.url));
}
