"use client";

import type { MonthlyTrendPointDto } from "@finflow/shared";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { compactMoney, formatMonth, money } from "@/lib/format";

const INCOME = "#059669";
const EXPENSE = "#f43f5e";

export function TrendChart({ points }: { points: MonthlyTrendPointDto[] }) {
  const data = points.map((point) => ({ ...point, label: formatMonth(point.month, true) }));
  return (
    <div className="h-72" role="img" aria-label="Income and expenses over the last months">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barGap={4} margin={{ left: 8, right: 8 }}>
          <CartesianGrid vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
          <YAxis
            tickFormatter={compactMoney}
            tickLine={false}
            axisLine={false}
            fontSize={12}
            width={80}
          />
          <Tooltip
            formatter={(value) => money(Number(value))}
            labelFormatter={(_, payload) =>
              payload?.[0] ? formatMonth(String(payload[0].payload.month)) : ""
            }
            cursor={{ fill: "#f1f5f9" }}
          />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="incomeCents" name="Income" fill={INCOME} radius={[4, 4, 0, 0]} />
          <Bar dataKey="expenseCents" name="Expenses" fill={EXPENSE} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
