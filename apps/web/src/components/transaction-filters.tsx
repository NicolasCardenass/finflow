import type { AccountDto, CategoryDto, ListTransactionsQuery } from "@finflow/shared";
import Link from "next/link";

const SORT_LABELS: Record<ListTransactionsQuery["sort"], string> = {
  date_desc: "Newest first",
  date_asc: "Oldest first",
  amount_desc: "Largest amount",
  amount_asc: "Smallest amount",
};

const control =
  "mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30";

/**
 * A plain GET form: submitting it updates the URL, so filters work without
 * client-side JavaScript and every filtered view has a shareable link.
 */
export function TransactionFilters({
  query,
  accounts,
  categories,
}: {
  query: ListTransactionsQuery;
  accounts: AccountDto[];
  categories: CategoryDto[];
}) {
  return (
    <form
      method="get"
      role="search"
      aria-label="Filter transactions"
      className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-6"
    >
      <label className="text-xs font-medium text-slate-600 lg:col-span-2">
        Search
        <input
          name="search"
          type="search"
          defaultValue={query.search}
          placeholder="Description or notes"
          className={control}
        />
      </label>
      <label className="text-xs font-medium text-slate-600">
        Type
        <select name="kind" defaultValue={query.kind ?? ""} className={control}>
          <option value="">All</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>
      </label>
      <label className="text-xs font-medium text-slate-600">
        Account
        <select name="accountId" defaultValue={query.accountId ?? ""} className={control}>
          <option value="">All accounts</option>
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs font-medium text-slate-600 lg:col-span-2">
        Category
        <select name="categoryId" defaultValue={query.categoryId ?? ""} className={control}>
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </label>
      <label className="text-xs font-medium text-slate-600">
        From
        <input name="from" type="date" defaultValue={query.from} className={control} />
      </label>
      <label className="text-xs font-medium text-slate-600">
        To
        <input name="to" type="date" defaultValue={query.to} className={control} />
      </label>
      <label className="text-xs font-medium text-slate-600 lg:col-span-2">
        Sort by
        <select name="sort" defaultValue={query.sort} className={control}>
          {Object.entries(SORT_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <div className="flex items-end gap-2 lg:col-span-2">
        <button
          type="submit"
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
        >
          Apply filters
        </button>
        <Link
          href="/transactions"
          className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
        >
          Clear
        </Link>
      </div>
    </form>
  );
}
