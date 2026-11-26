export default function AuthLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="hidden flex-col justify-between bg-emerald-700 p-12 text-emerald-50 lg:flex">
        <span className="text-xl font-semibold tracking-tight text-white">FinFlow</span>
        <div>
          <p className="text-3xl leading-snug font-semibold text-white">
            Know where your money goes.
          </p>
          <p className="mt-4 max-w-md text-emerald-100">
            Track accounts and transactions, set monthly budgets and see your spending at a glance.
          </p>
        </div>
        <p className="text-sm text-emerald-200">Demo account: demo@finflow.dev / demo1234</p>
      </aside>
      <main className="flex items-center justify-center px-6 py-16">{children}</main>
    </div>
  );
}
