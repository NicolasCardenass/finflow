import {
  DEFAULT_CATEGORIES,
  type CategoryDto,
  type CreateCategoryInput,
  type EntryKind,
  type UpdateCategoryInput,
} from "@finflow/shared";
import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, asc, eq } from "drizzle-orm";
import { isUniqueViolation } from "../common/db-errors.js";
import type { Database } from "../database/client.js";
import { DATABASE } from "../database/database.module.js";
import { categories } from "../database/schema.js";

const columns = {
  id: categories.id,
  name: categories.name,
  kind: categories.kind,
  color: categories.color,
};

const DUPLICATE = "You already have a category with this name and kind";

@Injectable()
export class CategoriesService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  list(userId: string, kind?: EntryKind): Promise<CategoryDto[]> {
    return this.db
      .select(columns)
      .from(categories)
      .where(and(eq(categories.userId, userId), kind ? eq(categories.kind, kind) : undefined))
      .orderBy(asc(categories.kind), asc(categories.name));
  }

  async get(userId: string, id: string): Promise<CategoryDto> {
    const [category] = await this.db
      .select(columns)
      .from(categories)
      .where(and(eq(categories.userId, userId), eq(categories.id, id)));
    if (!category) throw new NotFoundException("Category not found");
    return category;
  }

  async create(userId: string, input: CreateCategoryInput): Promise<CategoryDto> {
    try {
      const [created] = await this.db
        .insert(categories)
        .values({ ...input, userId })
        .returning(columns);
      return created!;
    } catch (error) {
      if (isUniqueViolation(error)) throw new ConflictException(DUPLICATE);
      throw error;
    }
  }

  async update(userId: string, id: string, input: UpdateCategoryInput): Promise<CategoryDto> {
    try {
      const [updated] = await this.db
        .update(categories)
        .set(input)
        .where(and(eq(categories.userId, userId), eq(categories.id, id)))
        .returning(columns);
      if (!updated) throw new NotFoundException("Category not found");
      return updated;
    } catch (error) {
      if (isUniqueViolation(error)) throw new ConflictException(DUPLICATE);
      throw error;
    }
  }

  /** Delete a category: its transactions become uncategorized and its budgets are removed. */
  async remove(userId: string, id: string): Promise<void> {
    const [deleted] = await this.db
      .delete(categories)
      .where(and(eq(categories.userId, userId), eq(categories.id, id)))
      .returning({ id: categories.id });
    if (!deleted) throw new NotFoundException("Category not found");
  }

  /** Give a new user a sensible starting set of categories. */
  async createDefaults(userId: string, db: Pick<Database, "insert"> = this.db): Promise<void> {
    await db
      .insert(categories)
      .values(DEFAULT_CATEGORIES.map((category) => ({ ...category, userId })))
      .onConflictDoNothing();
  }
}
