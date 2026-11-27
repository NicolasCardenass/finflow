import { yearMonth, type MonthlySummaryDto } from "@finflow/shared";
import type { Metadata } from "next";
import { MonthPicker } from "@/components/month-picker";
import { StatCard } from "@/components/stat-card";
import { api } from "@/lib/api";
import { change, money, percent, toYearMonth } from "@/lib/format";

export const metadata: Metadata = { title: "Dashboard" };

type Props = { searchParams: Promise<{ month?: string }> };

export default async function DashboardPage({ searchParams }: Props) {
  const params = await searchParams;
  const month = yearMonth.safeParse(params.month).data ?? toYearMonth(new Date());
  const returnTo = `/dashboard?month=${month}`;

  const summary = await api<MonthlySummaryDto>(
    `/reports/monthly-summary?month=${month}`,
    {},
    returnTo,
  );
  const previous = summary.previousMonth;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <MonthPicker month={month} basePath="/dashboard" />
      </div>

      <section aria-label="Monthly summary" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Income"
          value={money(summary.incomeCents)}
          change={change(summary.incomeCents, previous.incomeCents)}
          hint="vs last month"
        />
        <StatCard
          label="Expenses"
          value={money(summary.expenseCents)}
          change={change(summary.expenseCents, previous.expenseCents)}
          higherIsBetter={false}
          hint="vs last month"
        />
        <StatCard
          label="Net"
          value={money(summary.netCents)}
          change={change(summary.netCents, previous.netCents)}
          hint="vs last month"
        />
        <StatCard
          label="Savings rate"
          value={summary.savingsRate == null ? "—" : percent(summary.savingsRate)}
          hint={`${summary.transactionCount} transactions this month`}
        />
      </section>
    </div>
  );
}
