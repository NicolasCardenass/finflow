import type { PublicUser } from "@finflow/shared";
import type { Metadata } from "next";
import { logout } from "@/app/(auth)/actions";
import { api } from "@/lib/api";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await api<PublicUser>("/auth/me");

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">Dashboard</p>
          <h1 className="text-2xl font-semibold tracking-tight">
            Hi, {user.name.split(" ")[0]} 👋
          </h1>
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-50"
          >
            Sign out
          </button>
        </form>
      </header>
      <p className="mt-8 text-slate-600">Your accounts, budgets and charts will appear here.</p>
    </div>
  );
}
