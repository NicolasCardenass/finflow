import Link from "next/link";
import { addMonths, formatMonth } from "@/lib/format";

/** Previous/next month navigation that keeps state in the URL (?month=YYYY-MM). */
export function MonthPicker({ month, basePath }: { month: string; basePath: string }) {
  const link = (offset: number) => `${basePath}?month=${addMonths(month, offset)}`;
  const button =
    "grid size-8 place-items-center rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-50";
  return (
    <div className="flex items-center gap-2">
      <Link href={link(-1)} className={button} aria-label="Previous month">
        ‹
      </Link>
      <span className="min-w-36 text-center text-sm font-medium" aria-live="polite">
        {formatMonth(month)}
      </span>
      <Link href={link(1)} className={button} aria-label="Next month">
        ›
      </Link>
    </div>
  );
}
