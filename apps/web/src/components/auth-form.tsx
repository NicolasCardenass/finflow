"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { FormState } from "@/app/(auth)/actions";

type Field = {
  name: string;
  label: string;
  type: "text" | "email" | "password";
  autoComplete: string;
  hint?: string;
};

type AuthFormProps = {
  title: string;
  subtitle: string;
  submitLabel: string;
  fields: Field[];
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  footer: { text: string; linkLabel: string; href: string };
};

export function AuthForm({ title, subtitle, submitLabel, fields, action, footer }: AuthFormProps) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <div className="w-full max-w-sm">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-1 text-sm text-slate-500">{subtitle}</p>

      <form action={formAction} className="mt-8 space-y-5" noValidate>
        {state.error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {state.error}
          </p>
        )}

        {fields.map((field) => {
          const error = state.fieldErrors?.[field.name];
          const describedBy = error
            ? `${field.name}-error`
            : field.hint
              ? `${field.name}-hint`
              : undefined;
          return (
            <div key={field.name}>
              <label htmlFor={field.name} className="block text-sm font-medium text-slate-700">
                {field.label}
              </label>
              <input
                id={field.name}
                name={field.name}
                type={field.type}
                autoComplete={field.autoComplete}
                defaultValue={field.type === "password" ? undefined : state.values?.[field.name]}
                aria-invalid={error ? true : undefined}
                aria-describedby={describedBy}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-xs outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 aria-invalid:border-red-400"
              />
              {error ? (
                <p id={`${field.name}-error`} className="mt-1 text-xs text-red-600">
                  {error}
                </p>
              ) : (
                field.hint && (
                  <p id={`${field.name}-hint`} className="mt-1 text-xs text-slate-500">
                    {field.hint}
                  </p>
                )
              )}
            </div>
          );
        })}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
        >
          {pending ? "Please wait…" : submitLabel}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        {footer.text}{" "}
        <Link href={footer.href} className="font-medium text-emerald-700 hover:underline">
          {footer.linkLabel}
        </Link>
      </p>
    </div>
  );
}
