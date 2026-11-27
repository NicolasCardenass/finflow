import type { BudgetDto, BudgetStatus } from "@finflow/shared";
import { money, percent } from "@/lib/format";

const BAR: Record<BudgetStatus, string> = {
  ok: "bg-emerald-500",
  warning: "bg-amber-500",
  exceeded: "bg-red-500",
};

const LABEL: Record<BudgetStatus, string> = {
  ok: "On track",
  warning: "Close to the limit",
  exceeded: "Over budget",
};

export function BudgetProgress({ budget }: { budget: BudgetDto }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="font-medium">{budget.category.name}</span>
        <span className="text-slate-500 tabular-nums">
          {money(budget.spentCents)} / {money(budget.limitCents)}
        </span>
      </div>
      <div
        className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-label={`${budget.category.name} budget`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(Math.min(budget.usage, 1) * 100)}
        aria-valuetext={`${percent(budget.usage)} used, ${LABEL[budget.status].toLowerCase()}`}
      >
        <div
          className={`h-full rounded-full ${BAR[budget.status]}`}
          style={{ width: `${Math.min(budget.usage, 1) * 100}%` }}
        />
      </div>
      <p className="mt-1 text-xs text-slate-500">
        {LABEL[budget.status]} · {percent(budget.usage)} used
      </p>
    </div>
  );
}
