import { z } from "zod";

export const ACCOUNT_TYPES = ["checking", "savings", "credit_card", "cash", "investment"] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

const cents = z.number().int("Amounts are integer cents").safe();

const accountFields = {
  name: z.string().trim().min(1, "Name is required").max(60),
  type: z.enum(ACCOUNT_TYPES),
  initialBalanceCents: cents,
};

export const createAccountSchema = z.object({
  ...accountFields,
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, "Currency must be a 3-letter ISO code")
    .default("BRL"),
  initialBalanceCents: accountFields.initialBalanceCents.default(0),
});

// Built from the fields without defaults: a partial update must not reset
// omitted fields to their default values. The currency cannot change after
// creation because existing amounts are recorded in it.
export const updateAccountSchema = z
  .object(accountFields)
  .partial()
  .extend({ archived: z.boolean().optional() })
  .refine((value) => Object.keys(value).length > 0, "Provide at least one field to update");

export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;

export type AccountDto = {
  id: string;
  name: string;
  type: AccountType;
  currency: string;
  initialBalanceCents: number;
  /** Initial balance plus income minus expenses of the account's transactions. */
  balanceCents: number;
  archived: boolean;
  createdAt: string;
};
