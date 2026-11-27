"use client";

import type { CategorySpendingDto } from "@finflow/shared";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { money, percent } from "@/lib/format";

const UNCATEGORIZED = "#94a3b8";

export function CategoryChart({ items }: { items: CategorySpendingDto[] }) {
  if (items.length === 0) {
    return <p className="py-16 text-center text-sm text-slate-500">No expenses this month.</p>;
  }
  const data = items.map((item) => ({
    name: item.category?.name ?? "Uncategorized",
    color: item.category?.color ?? UNCATEGORIZED,
    value: item.totalCents,
    share: item.share,
  }));

  return (
    <div className="space-y-4">
      <div className="mx-auto h-48 max-w-56" role="img" aria-label="Expenses by category">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="60%"
              outerRadius="95%"
              paddingAngle={2}
              stroke="none"
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => money(Number(value))} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      {/* The legend doubles as an accessible table of the chart's data. */}
      <ul className="space-y-2 text-sm">
        {data.map((entry) => (
          <li key={entry.name} className="flex items-center gap-2">
            <span className="size-2.5 shrink-0 rounded-full" style={{ background: entry.color }} />
            <span className="truncate">{entry.name}</span>
            <span className="ml-auto text-slate-500 tabular-nums">{percent(entry.share)}</span>
            <span className="w-24 text-right font-medium tabular-nums">{money(entry.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
