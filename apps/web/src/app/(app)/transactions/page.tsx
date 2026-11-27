import {
  listTransactionsQuerySchema,
  type AccountDto,
  type CategoryDto,
  type Page,
  type TransactionDto,
} from "@finflow/shared";
import type { Metadata } from "next";
import { Pagination } from "@/components/pagination";
import { TransactionFilters } from "@/components/transaction-filters";
import { CategoryBadge, formatDay, SignedAmount } from "@/components/transaction-row";
import { api } from "@/lib/api";
import { toQueryString } from "@/lib/url";

export const metadata: Metadata = { title: "Transactions" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function TransactionsPage({ searchParams }: Props) {
  // Empty form fields arrive as "", which the API schema would reject: drop them first.
  const raw = Object.fromEntries(
    Object.entries(await searchParams).filter(([, value]) => typeof value === "string" && value),
  );
  // Same schema as the API; a malformed URL falls back to the default listing.
  const defaults = listTransactionsQuerySchema.parse({});
  const parsed = listTransactionsQuerySchema.safeParse(raw);
  const query = parsed.success ? parsed.data : defaults;
  // Page links keep the filters but leave default values out of the URL.
  const qs = (page: number) =>
    toQueryString({
      ...query,
      page: page === defaults.page ? undefined : page,
      pageSize: query.pageSize === defaults.pageSize ? undefined : query.pageSize,
      sort: query.sort === defaults.sort ? undefined : query.sort,
    });
  const get = <T,>(path: string) => api<T>(path, {}, `/transactions${qs(query.page)}`);

  const [result, accounts, categories] = await Promise.all([
    get<Page<TransactionDto>>(`/transactions${toQueryString(query)}`),
    get<AccountDto[]>("/accounts"),
    get<CategoryDto[]>("/categories"),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Transactions</h1>
        <p className="text-sm text-slate-500" aria-live="polite">
          {result.total} {result.total === 1 ? "transaction" : "transactions"}
        </p>
      </div>

      {!parsed.success && (
        <p role="alert" className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Some filters were invalid and have been reset.
        </p>
      )}

      <TransactionFilters query={query} accounts={accounts} categories={categories} />

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 text-left text-xs text-slate-500">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">
                Date
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Description
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Category
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Account
              </th>
              <th scope="col" className="px-4 py-3 text-right font-medium">
                Amount
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {result.items.map((transaction) => (
              <tr key={transaction.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                  {formatDay(transaction.occurredOn)}
                </td>
                <td className="px-4 py-3 font-medium">{transaction.description}</td>
                <td className="px-4 py-3">
                  <CategoryBadge category={transaction.category} />
                </td>
                <td className="px-4 py-3 text-slate-600">{transaction.account.name}</td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <SignedAmount transaction={transaction} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {result.items.length === 0 && (
          <p className="px-4 py-12 text-center text-sm text-slate-500">
            No transactions match these filters.
          </p>
        )}
      </div>

      <div className="flex justify-center">
        <Pagination
          page={result.page}
          totalPages={result.totalPages}
          href={(page) => `/transactions${qs(page)}`}
        />
      </div>
    </div>
  );
}
