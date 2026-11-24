import { z } from "zod";

export const ENTRY_KINDS = ["income", "expense"] as const;
export type EntryKind = (typeof ENTRY_KINDS)[number];

const hexColor = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Color must be a hex value like #22c55e")
  .transform((value) => value.toLowerCase());

const categoryFields = {
  name: z.string().trim().min(1, "Name is required").max(40),
  color: hexColor,
};

export const createCategorySchema = z.object({
  ...categoryFields,
  kind: z.enum(ENTRY_KINDS),
  color: hexColor.default("#64748b"),
});

/** The kind cannot change: transactions and budgets depend on it. */
export const updateCategorySchema = z
  .object(categoryFields)
  .partial()
  .refine((value) => Object.keys(value).length > 0, "Provide at least one field to update");

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

export type CategoryDto = {
  id: string;
  name: string;
  kind: EntryKind;
  color: string;
};

/** Categories created for every new user. */
export const DEFAULT_CATEGORIES: readonly CreateCategoryInput[] = [
  { name: "Salary", kind: "income", color: "#16a34a" },
  { name: "Other income", kind: "income", color: "#22c55e" },
  { name: "Housing", kind: "expense", color: "#dc2626" },
  { name: "Groceries", kind: "expense", color: "#f97316" },
  { name: "Restaurants", kind: "expense", color: "#eab308" },
  { name: "Transport", kind: "expense", color: "#3b82f6" },
  { name: "Health", kind: "expense", color: "#14b8a6" },
  { name: "Utilities", kind: "expense", color: "#8b5cf6" },
  { name: "Leisure", kind: "expense", color: "#ec4899" },
  { name: "Other expenses", kind: "expense", color: "#64748b" },
];
