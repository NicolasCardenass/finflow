import { percent } from "@/lib/format";

type StatCardProps = {
  label: string;
  value: string;
  /** Relative change vs the previous period; null hides the badge. */
  change?: number | null;
  /** Whether an increase is good news (income) or bad news (expenses). */
  higherIsBetter?: boolean;
  hint?: string;
};

export function StatCard({ label, value, change, higherIsBetter = true, hint }: StatCardProps) {
  const good = change != null && change >= 0 === higherIsBetter;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
      <p className="mt-2 flex items-center gap-2 text-xs text-slate-500">
        {change != null && (
          <span
            className={`rounded-full px-2 py-0.5 font-medium ${good ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}
          >
            {change >= 0 ? "▲" : "▼"} {percent(Math.abs(change))}
          </span>
        )}
        {hint}
      </p>
    </div>
  );
}
