import { z } from "zod";
import { ENTRY_KINDS } from "./categories.js";

/** Calendar date as YYYY-MM-DD, validated as a real date. */
export const isoDate = z.iso.date("Dates must use the YYYY-MM-DD format");

const transactionFields = {
  accountId: z.uuid(),
  categoryId: z.uuid().nullable(),
  kind: z.enum(ENTRY_KINDS),
  amountCents: z
    .number()
    .int("Amounts are integer cents")
    .positive("Amount must be positive")
    .max(10_000_000_000, "Amount is too large"),
  description: z.string().trim().min(1, "Description is required").max(140),
  occurredOn: isoDate,
  notes: z.string().trim().max(1000).nullable(),
};

export const createTransactionSchema = z.object({
  ...transactionFields,
  categoryId: transactionFields.categoryId.default(null),
  notes: transactionFields.notes.default(null),
});

export const updateTransactionSchema = z
  .object(transactionFields)
  .partial()
  .refine((value) => Object.keys(value).length > 0, "Provide at least one field to update");

export const TRANSACTION_SORTS = ["date_desc", "date_asc", "amount_desc", "amount_asc"] as const;

export const listTransactionsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    from: isoDate.optional(),
    to: isoDate.optional(),
    accountId: z.uuid().optional(),
    categoryId: z.uuid().optional(),
    kind: z.enum(ENTRY_KINDS).optional(),
    search: z.string().trim().min(1).max(100).optional(),
    sort: z.enum(TRANSACTION_SORTS).default("date_desc"),
  })
  .refine((q) => !q.from || !q.to || q.from <= q.to, {
    message: "`from` must not be after `to`",
    path: ["from"],
  });

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
export type ListTransactionsQuery = z.infer<typeof listTransactionsQuerySchema>;

export type TransactionDto = {
  id: string;
  kind: (typeof ENTRY_KINDS)[number];
  amountCents: number;
  description: string;
  occurredOn: string;
  notes: string | null;
  account: { id: string; name: string };
  category: { id: string; name: string; color: string } | null;
  createdAt: string;
};

export type Page<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};
