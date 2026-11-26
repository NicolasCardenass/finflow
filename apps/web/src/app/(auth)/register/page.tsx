import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";
import { register } from "../actions";

export const metadata: Metadata = { title: "Create account" };

export default function RegisterPage() {
  return (
    <AuthForm
      title="Create your account"
      subtitle="Start tracking your finances in a minute."
      submitLabel="Create account"
      action={register}
      fields={[
        { name: "name", label: "Name", type: "text", autoComplete: "name" },
        { name: "email", label: "Email", type: "email", autoComplete: "email" },
        {
          name: "password",
          label: "Password",
          type: "password",
          autoComplete: "new-password",
          hint: "At least 8 characters.",
        },
      ]}
      footer={{ text: "Already have an account?", linkLabel: "Sign in", href: "/login" }}
    />
  );
}
