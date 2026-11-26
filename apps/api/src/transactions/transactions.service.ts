import type {
  CreateTransactionInput,
  EntryKind,
  ListTransactionsQuery,
  Page,
  TransactionDto,
  UpdateTransactionInput,
} from "@finflow/shared";
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { and, asc, count, desc, eq, gte, ilike, lte, type SQL } from "drizzle-orm";
import type { Database } from "../database/client.js";
import { DATABASE } from "../database/database.module.js";
import { accounts, categories, transactions } from "../database/schema.js";

const SORTS = {
  date_desc: [desc(transactions.occurredOn), desc(transactions.createdAt)],
  date_asc: [asc(transactions.occurredOn), asc(transactions.createdAt)],
  amount_desc: [desc(transactions.amountCents), desc(transactions.occurredOn)],
  amount_asc: [asc(transactions.amountCents), desc(transactions.occurredOn)],
} satisfies Record<ListTransactionsQuery["sort"], SQL[]>;

/** Escape LIKE wildcards so user input is matched literally. */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

@Injectable()
export class TransactionsService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async list(userId: string, query: ListTransactionsQuery): Promise<Page<TransactionDto>> {
    const where = and(
      eq(transactions.userId, userId),
      query.from ? gte(transactions.occurredOn, query.from) : undefined,
      query.to ? lte(transactions.occurredOn, query.to) : undefined,
      query.accountId ? eq(transactions.accountId, query.accountId) : undefined,
      query.categoryId ? eq(transactions.categoryId, query.categoryId) : undefined,
      query.kind ? eq(transactions.kind, query.kind) : undefined,
      query.search ? ilike(transactions.description, `%${escapeLike(query.search)}%`) : undefined,
    );

    const [items, [totals]] = await Promise.all([
      this.select()
        .where(where)
        .orderBy(...SORTS[query.sort])
        .limit(query.pageSize)
        .offset((query.page - 1) * query.pageSize),
      this.db.select({ total: count() }).from(transactions).where(where),
    ]);

    const total = totals?.total ?? 0;
    return {
      items: items.map(toDto),
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize),
    };
  }

  async get(userId: string, id: string): Promise<TransactionDto> {
    const [row] = await this.select().where(
      and(eq(transactions.userId, userId), eq(transactions.id, id)),
    );
    if (!row) throw new NotFoundException("Transaction not found");
    return toDto(row);
  }

  async create(userId: string, input: CreateTransactionInput): Promise<TransactionDto> {
    await this.assertReferences(userId, input.accountId, input.categoryId, input.kind);
    const [created] = await this.db
      .insert(transactions)
      .values({ ...input, userId })
      .returning({ id: transactions.id });
    return this.get(userId, created!.id);
  }

  async update(userId: string, id: string, input: UpdateTransactionInput): Promise<TransactionDto> {
    const current = await this.get(userId, id);
    const kind = input.kind ?? current.kind;
    const accountId = input.accountId ?? current.account.id;
    const categoryId =
      input.categoryId === undefined ? (current.category?.id ?? null) : input.categoryId;
    await this.assertReferences(userId, accountId, categoryId, kind, input.accountId !== undefined);

    await this.db
      .update(transactions)
      .set(input)
      .where(and(eq(transactions.userId, userId), eq(transactions.id, id)));
    return this.get(userId, id);
  }

  async remove(userId: string, id: string): Promise<void> {
    const [deleted] = await this.db
      .delete(transactions)
      .where(and(eq(transactions.userId, userId), eq(transactions.id, id)))
      .returning({ id: transactions.id });
    if (!deleted) throw new NotFoundException("Transaction not found");
  }

  /**
   * The account and category must belong to the user, new entries can't go
   * to archived accounts, and the category must match the transaction kind
   * (no "Salary" expenses).
   */
  private async assertReferences(
    userId: string,
    accountId: string,
    categoryId: string | null,
    kind: EntryKind,
    accountChanged = true,
  ): Promise<void> {
    const [account] = await this.db
      .select({ archivedAt: accounts.archivedAt })
      .from(accounts)
      .where(and(eq(accounts.userId, userId), eq(accounts.id, accountId)));
    if (!account) throw new BadRequestException("Account not found");
    if (account.archivedAt && accountChanged) {
      throw new UnprocessableEntityException("Archived accounts can't receive new transactions");
    }

    if (categoryId) {
      const [category] = await this.db
        .select({ kind: categories.kind })
        .from(categories)
        .where(and(eq(categories.userId, userId), eq(categories.id, categoryId)));
      if (!category) throw new BadRequestException("Category not found");
      if (category.kind !== kind) {
        throw new UnprocessableEntityException(
          `A ${kind} can't use a category meant for ${category.kind}`,
        );
      }
    }
  }

  private select() {
    return this.db
      .select({
        id: transactions.id,
        kind: transactions.kind,
        amountCents: transactions.amountCents,
        description: transactions.description,
        occurredOn: transactions.occurredOn,
        notes: transactions.notes,
        createdAt: transactions.createdAt,
        accountId: accounts.id,
        accountName: accounts.name,
        categoryId: categories.id,
        categoryName: categories.name,
        categoryColor: categories.color,
      })
      .from(transactions)
      .innerJoin(accounts, eq(accounts.id, transactions.accountId))
      .leftJoin(categories, eq(categories.id, transactions.categoryId))
      .$dynamic();
  }
}

type Row = Awaited<ReturnType<ReturnType<TransactionsService["select"]>["execute"]>>[number];

function toDto(row: Row): TransactionDto {
  return {
    id: row.id,
    kind: row.kind,
    amountCents: row.amountCents,
    description: row.description,
    occurredOn: row.occurredOn,
    notes: row.notes,
    account: { id: row.accountId, name: row.accountName },
    category:
      row.categoryId && row.categoryName && row.categoryColor
        ? { id: row.categoryId, name: row.categoryName, color: row.categoryColor }
        : null,
    createdAt: row.createdAt.toISOString(),
  };
}
