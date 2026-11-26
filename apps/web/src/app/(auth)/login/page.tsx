import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";
import { login } from "../actions";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <AuthForm
      title="Welcome back"
      subtitle="Sign in to your FinFlow account."
      submitLabel="Sign in"
      action={login}
      fields={[
        { name: "email", label: "Email", type: "email", autoComplete: "email" },
        { name: "password", label: "Password", type: "password", autoComplete: "current-password" },
      ]}
      footer={{ text: "New to FinFlow?", linkLabel: "Create an account", href: "/register" }}
    />
  );
}
