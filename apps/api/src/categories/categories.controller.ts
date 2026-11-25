import {
  createCategorySchema,
  ENTRY_KINDS,
  updateCategorySchema,
  type CategoryDto,
  type CreateCategoryInput,
  type EntryKind,
  type UpdateCategoryInput,
} from "@finflow/shared";
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { CurrentUser, type AuthUser } from "../auth/current-user.decorator.js";
import { ZodValidationPipe } from "../common/zod-validation.pipe.js";
import { CategoriesService } from "./categories.service.js";
import { ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
import { ApiZodBody } from "../common/openapi.js";

@ApiTags("Categories")
@Controller("categories")
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: "List categories" })
  @ApiQuery({ name: "kind", required: false, enum: ENTRY_KINDS })
  list(
    @CurrentUser() user: AuthUser,
    @Query("kind", new ParseEnumPipe(ENTRY_KINDS, { optional: true })) kind?: EntryKind,
  ): Promise<CategoryDto[]> {
    return this.categories.list(user.id, kind);
  }

  @Post()
  @ApiOperation({ summary: "Create a category" })
  @ApiZodBody(createCategorySchema)
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createCategorySchema)) body: CreateCategoryInput,
  ): Promise<CategoryDto> {
    return this.categories.create(user.id, body);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a category" })
  get(
    @CurrentUser() user: AuthUser,
    @Param("id", new ParseUUIDPipe()) id: string,
  ): Promise<CategoryDto> {
    return this.categories.get(user.id, id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Rename or recolor a category" })
  @ApiZodBody(updateCategorySchema)
  update(
    @CurrentUser() user: AuthUser,
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(updateCategorySchema)) body: UpdateCategoryInput,
  ): Promise<CategoryDto> {
    return this.categories.update(user.id, id, body);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete a category (transactions become uncategorized)" })
  remove(
    @CurrentUser() user: AuthUser,
    @Param("id", new ParseUUIDPipe()) id: string,
  ): Promise<void> {
    return this.categories.remove(user.id, id);
  }
}
