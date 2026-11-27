import type { PublicUser } from "@finflow/shared";
import Link from "next/link";
import { logout } from "@/app/(auth)/actions";
import { NavLink } from "@/components/nav-link";
import { api } from "@/lib/api";

const NAVIGATION = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/transactions", label: "Transactions" },
];

export default async function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await api<PublicUser>("/auth/me");

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-8 gap-y-2 px-6 py-3">
          <Link href="/dashboard" className="text-lg font-semibold tracking-tight text-emerald-700">
            FinFlow
          </Link>
          <nav aria-label="Main" className="flex gap-1">
            {NAVIGATION.map((item) => (
              <NavLink key={item.href} href={item.href}>
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-sm text-slate-500 sm:inline">{user.email}</span>
            <form action={logout}>
              <button
                type="submit"
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-50"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
