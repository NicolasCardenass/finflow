import {
  createTransactionSchema,
  listTransactionsQuerySchema,
  updateTransactionSchema,
  type CreateTransactionInput,
  type ListTransactionsQuery,
  type Page,
  type TransactionDto,
  type UpdateTransactionInput,
} from "@finflow/shared";
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from "@nestjs/common";
import { CurrentUser, type AuthUser } from "../auth/current-user.decorator.js";
import { RawQuery } from "../common/query.decorator.js";
import { ZodValidationPipe } from "../common/zod-validation.pipe.js";
import { TransactionsService } from "./transactions.service.js";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { ApiZodBody, ApiZodQuery } from "../common/openapi.js";

@ApiTags("Transactions")
@Controller("transactions")
export class TransactionsController {
  constructor(private readonly transactions: TransactionsService) {}

  @Get()
  @ApiOperation({ summary: "List transactions with filters and pagination" })
  @ApiZodQuery(listTransactionsQuerySchema)
  list(
    @CurrentUser() user: AuthUser,
    @RawQuery(new ZodValidationPipe(listTransactionsQuerySchema)) query: ListTransactionsQuery,
  ): Promise<Page<TransactionDto>> {
    return this.transactions.list(user.id, query);
  }

  @Post()
  @ApiOperation({ summary: "Record an income or expense" })
  @ApiZodBody(createTransactionSchema)
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createTransactionSchema)) body: CreateTransactionInput,
  ): Promise<TransactionDto> {
    return this.transactions.create(user.id, body);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a transaction" })
  get(
    @CurrentUser() user: AuthUser,
    @Param("id", new ParseUUIDPipe()) id: string,
  ): Promise<TransactionDto> {
    return this.transactions.get(user.id, id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update a transaction" })
  @ApiZodBody(updateTransactionSchema)
  update(
    @CurrentUser() user: AuthUser,
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(updateTransactionSchema)) body: UpdateTransactionInput,
  ): Promise<TransactionDto> {
    return this.transactions.update(user.id, id, body);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete a transaction" })
  remove(
    @CurrentUser() user: AuthUser,
    @Param("id", new ParseUUIDPipe()) id: string,
  ): Promise<void> {
    return this.transactions.remove(user.id, id);
  }
}
