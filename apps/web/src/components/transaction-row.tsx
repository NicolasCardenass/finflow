import type { TransactionDto } from "@finflow/shared";
import { money } from "@/lib/format";

const dateFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

export const formatDay = (isoDate: string) => dateFormat.format(new Date(`${isoDate}T00:00:00Z`));

export function SignedAmount({ transaction }: { transaction: TransactionDto }) {
  const income = transaction.kind === "income";
  return (
    <span className={`font-medium tabular-nums ${income ? "text-emerald-700" : "text-slate-900"}`}>
      {income ? "+" : "−"}
      {money(transaction.amountCents)}
    </span>
  );
}

export function CategoryBadge({ category }: { category: TransactionDto["category"] }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-slate-600">
      <span
        className="size-2 rounded-full"
        style={{ background: category?.color ?? "#94a3b8" }}
        aria-hidden
      />
      {category?.name ?? "Uncategorized"}
    </span>
  );
}
