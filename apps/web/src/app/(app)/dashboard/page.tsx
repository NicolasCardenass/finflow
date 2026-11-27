import {
  yearMonth,
  type BudgetDto,
  type CategorySpendingDto,
  type MonthlySummaryDto,
  type MonthlyTrendPointDto,
  type Page,
  type TransactionDto,
} from "@finflow/shared";
import type { Metadata } from "next";
import { BudgetProgress } from "@/components/budget-progress";
import { Card } from "@/components/card";
import { CategoryChart } from "@/components/category-chart";
import { MonthPicker } from "@/components/month-picker";
import { StatCard } from "@/components/stat-card";
import { CategoryBadge, formatDay, SignedAmount } from "@/components/transaction-row";
import { TrendChart } from "@/components/trend-chart";
import { api } from "@/lib/api";
import { addMonths, change, money, percent, toYearMonth } from "@/lib/format";

export const metadata: Metadata = { title: "Dashboard" };

type Props = { searchParams: Promise<{ month?: string }> };

/** First and last day of a "YYYY-MM" month, as ISO dates. */
function monthRange(month: string) {
  const lastDay = new Date(`${addMonths(month, 1)}-01T00:00:00Z`);
  lastDay.setUTCDate(0);
  return { from: `${month}-01`, to: lastDay.toISOString().slice(0, 10) };
}

export default async function DashboardPage({ searchParams }: Props) {
  const params = await searchParams;
  const month = yearMonth.safeParse(params.month).data ?? toYearMonth(new Date());
  const { from, to } = monthRange(month);
  const get = <T,>(path: string) => api<T>(path, {}, `/dashboard?month=${month}`);

  // Independent requests run in parallel; the page renders once all resolve.
  const [summary, trend, categories, budgets, recent] = await Promise.all([
    get<MonthlySummaryDto>(`/reports/monthly-summary?month=${month}`),
    get<MonthlyTrendPointDto[]>(`/reports/monthly-trend?months=6&until=${month}`),
    get<CategorySpendingDto[]>(`/reports/spending-by-category?from=${from}&to=${to}`),
    get<BudgetDto[]>(`/budgets?month=${month}`),
    get<Page<TransactionDto>>(`/transactions?from=${from}&to=${to}&pageSize=6`),
  ]);
  const previous = summary.previousMonth;

  return (
    <div className="space-y-6">
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

      <div className="grid gap-6 lg:grid-cols-5">
        <Card title="Income vs expenses" className="lg:col-span-3">
          <TrendChart points={trend} />
        </Card>
        <Card title="Spending by category" className="lg:col-span-2">
          <CategoryChart items={categories} />
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card title="Budgets" className="lg:col-span-2">
          {budgets.length === 0 ? (
            <p className="text-sm text-slate-500">No budgets for this month.</p>
          ) : (
            <div className="space-y-4">
              {budgets.map((budget) => (
                <BudgetProgress key={budget.id} budget={budget} />
              ))}
            </div>
          )}
        </Card>
        <Card title="Recent transactions" className="lg:col-span-3">
          {recent.items.length === 0 ? (
            <p className="text-sm text-slate-500">No transactions this month.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recent.items.map((transaction) => (
                <li key={transaction.id} className="flex items-center gap-4 py-2.5">
                  <span className="w-12 text-xs text-slate-500">
                    {formatDay(transaction.occurredOn)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{transaction.description}</p>
                    <CategoryBadge category={transaction.category} />
                  </div>
                  <SignedAmount transaction={transaction} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
