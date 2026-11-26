import { NextResponse, type NextRequest } from "next/server";

const REFRESH_COOKIE = "ff_refresh";
const AUTH_PAGES = ["/login", "/register"];

/**
 * Route-level guard: signed-out users can't open the app and signed-in users
 * skip the auth pages. It only checks that a session cookie exists; the API
 * still verifies the token on every request.
 */
export function proxy(request: NextRequest) {
  const signedIn = request.cookies.has(REFRESH_COOKIE);
  const { pathname } = request.nextUrl;

  if (AUTH_PAGES.includes(pathname)) {
    return signedIn
      ? NextResponse.redirect(new URL("/dashboard", request.url))
      : NextResponse.next();
  }
  if (!signedIn) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  // Everything except API routes, Next.js assets and static files.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
