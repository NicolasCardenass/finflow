import "server-only";
import { redirect } from "next/navigation";
import { API_URL } from "./env";
import { readSession } from "./session";

export type FieldErrors = Partial<Record<string, string>>;

/** An error answered by the API, with its status and validation messages per field. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly fieldErrors: FieldErrors = {},
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type ErrorBody = { message?: string | string[]; errors?: { path: string; message: string }[] };

async function toApiError(response: Response): Promise<ApiError> {
  const body = (await response.json().catch(() => ({}))) as ErrorBody;
  const message = Array.isArray(body.message) ? body.message.join(", ") : body.message;
  const fieldErrors: FieldErrors = {};
  for (const error of body.errors ?? []) fieldErrors[error.path] ??= error.message;
  return new ApiError(response.status, message ?? response.statusText, fieldErrors);
}

/** Call the API without credentials (sign in, sign up, refresh). */
export async function publicApi<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init.headers },
    cache: "no-store",
  });
  if (!response.ok) throw await toApiError(response);
  return (response.status === 204 ? undefined : await response.json()) as T;
}

/**
 * Call the API as the signed-in user. When the access token is missing or
 * expired, the user is sent through /api/session/refresh, which renews the
 * tokens and comes back to `returnTo` (Server Components can't set cookies).
 */
export async function api<T>(
  path: string,
  init: RequestInit = {},
  returnTo = "/dashboard",
): Promise<T> {
  const { accessToken, refreshToken } = await readSession();
  const refresh = `/api/session/refresh?next=${encodeURIComponent(returnTo)}`;
  if (!accessToken) redirect(refreshToken ? refresh : "/login");

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...init.headers,
    },
    cache: "no-store",
  });
  if (response.status === 401) redirect(refresh);
  if (!response.ok) throw await toApiError(response);
  return (response.status === 204 ? undefined : await response.json()) as T;
}
