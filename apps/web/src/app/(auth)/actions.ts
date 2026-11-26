"use server";

import { loginSchema, registerSchema, type AuthResponse } from "@finflow/shared";
import { redirect } from "next/navigation";
import type { z } from "zod";
import { ApiError, publicApi, type FieldErrors } from "@/lib/api";
import { clearSession, readSession, saveSession } from "@/lib/session";

export type FormState = {
  error?: string;
  fieldErrors?: FieldErrors;
  values?: Record<string, string>;
};

function fieldErrorsOf(error: z.ZodError): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of error.issues) errors[String(issue.path[0])] ??= issue.message;
  return errors;
}

async function authenticate(
  path: "/auth/login" | "/auth/register",
  schema: typeof loginSchema | typeof registerSchema,
  formData: FormData,
): Promise<FormState> {
  const raw = Object.fromEntries(formData) as Record<string, string>;
  // Echo values back so the form keeps them, but never the password.
  const values = { email: raw.email ?? "", name: raw.name ?? "" };

  // Validate with the same schema as the API to give instant, consistent feedback.
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: fieldErrorsOf(parsed.error), values };

  try {
    const response = await publicApi<AuthResponse>(path, {
      method: "POST",
      body: JSON.stringify(parsed.data),
    });
    await saveSession(response);
  } catch (error) {
    if (error instanceof ApiError && error.status < 500) {
      return { error: error.message, fieldErrors: error.fieldErrors, values };
    }
    return { error: "The service is unavailable. Please try again in a moment.", values };
  }
  redirect("/dashboard");
}

export async function login(_state: FormState, formData: FormData): Promise<FormState> {
  return authenticate("/auth/login", loginSchema, formData);
}

export async function register(_state: FormState, formData: FormData): Promise<FormState> {
  return authenticate("/auth/register", registerSchema, formData);
}

export async function logout(): Promise<void> {
  const { refreshToken } = await readSession();
  if (refreshToken) {
    // Revoke server-side too; ignore failures so the user can always sign out locally.
    await publicApi("/auth/logout", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    }).catch(() => undefined);
  }
  await clearSession();
  redirect("/login");
}
