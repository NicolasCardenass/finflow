import type { AccountDto, CreateAccountInput, UpdateAccountInput } from "@finflow/shared";
import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import type { Database } from "../database/client.js";
import { DATABASE } from "../database/database.module.js";
import { accounts, transactions } from "../database/schema.js";

const UNIQUE_VIOLATION = "23505";

function isUniqueViolation(error: unknown): boolean {
  const cause = (error as { cause?: { code?: string } })?.cause ?? error;
  return (cause as { code?: string })?.code === UNIQUE_VIOLATION;
}

/** Signed sum of an account's transactions, computed in the database. */
const transactionsTotal = sql<string>`coalesce(sum(
  case when ${transactions.kind} = 'income' then ${transactions.amountCents}
       else -${transactions.amountCents} end), 0)`;

@Injectable()
export class AccountsService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async list(userId: string, includeArchived = false): Promise<AccountDto[]> {
    const rows = await this.selectWithBalance()
      .where(
        and(eq(accounts.userId, userId), includeArchived ? undefined : isNull(accounts.archivedAt)),
      )
      .groupBy(accounts.id)
      .orderBy(asc(accounts.name));
    return rows.map(toDto);
  }

  async get(userId: string, id: string): Promise<AccountDto> {
    const [row] = await this.selectWithBalance()
      .where(and(eq(accounts.userId, userId), eq(accounts.id, id)))
      .groupBy(accounts.id);
    // Accounts of other users are reported as missing, not forbidden, so ids can't be probed.
    if (!row) throw new NotFoundException("Account not found");
    return toDto(row);
  }

  async create(userId: string, input: CreateAccountInput): Promise<AccountDto> {
    try {
      const [created] = await this.db
        .insert(accounts)
        .values({ ...input, userId })
        .returning({ id: accounts.id });
      return this.get(userId, created!.id);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException("You already have an account with this name");
      }
      throw error;
    }
  }

  async update(userId: string, id: string, input: UpdateAccountInput): Promise<AccountDto> {
    const { archived, ...fields } = input;
    try {
      const [updated] = await this.db
        .update(accounts)
        .set({
          ...fields,
          ...(archived === undefined ? {} : { archivedAt: archived ? new Date() : null }),
        })
        .where(and(eq(accounts.userId, userId), eq(accounts.id, id)))
        .returning({ id: accounts.id });
      if (!updated) throw new NotFoundException("Account not found");
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException("You already have an account with this name");
      }
      throw error;
    }
    return this.get(userId, id);
  }

  /**
   * Delete an account without transactions. Accounts with history must be
   * archived instead, so past transactions and reports stay intact.
   */
  async remove(userId: string, id: string): Promise<void> {
    const account = await this.get(userId, id);
    const [usage] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(transactions)
      .where(eq(transactions.accountId, account.id));
    if ((usage?.count ?? 0) > 0) {
      throw new ConflictException(
        "This account has transactions; archive it instead of deleting it",
      );
    }
    await this.db.delete(accounts).where(and(eq(accounts.userId, userId), eq(accounts.id, id)));
  }

  private selectWithBalance() {
    return this.db
      .select({
        id: accounts.id,
        name: accounts.name,
        type: accounts.type,
        currency: accounts.currency,
        initialBalanceCents: accounts.initialBalanceCents,
        archivedAt: accounts.archivedAt,
        createdAt: accounts.createdAt,
        transactionsTotal,
      })
      .from(accounts)
      .leftJoin(transactions, eq(transactions.accountId, accounts.id))
      .$dynamic();
  }
}

type AccountRow = {
  id: string;
  name: string;
  type: AccountDto["type"];
  currency: string;
  initialBalanceCents: number;
  archivedAt: Date | null;
  createdAt: Date;
  transactionsTotal: string;
};

function toDto(row: AccountRow): AccountDto {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    currency: row.currency,
    initialBalanceCents: row.initialBalanceCents,
    // SUM over BIGINT returns NUMERIC, which the driver sends as a string.
    balanceCents: row.initialBalanceCents + Number(row.transactionsTotal),
    archived: row.archivedAt !== null,
    createdAt: row.createdAt.toISOString(),
  };
}
