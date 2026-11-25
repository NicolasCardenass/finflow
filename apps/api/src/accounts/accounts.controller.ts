import {
  createAccountSchema,
  updateAccountSchema,
  type AccountDto,
  type CreateAccountInput,
  type UpdateAccountInput,
} from "@finflow/shared";
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseBoolPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { CurrentUser, type AuthUser } from "../auth/current-user.decorator.js";
import { ZodValidationPipe } from "../common/zod-validation.pipe.js";
import { AccountsService } from "./accounts.service.js";
import { ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
import { ApiZodBody } from "../common/openapi.js";

@ApiTags("Accounts")
@Controller("accounts")
export class AccountsController {
  constructor(private readonly accounts: AccountsService) {}

  @Get()
  @ApiOperation({ summary: "List accounts with balances" })
  @ApiQuery({ name: "includeArchived", required: false, type: Boolean })
  list(
    @CurrentUser() user: AuthUser,
    @Query("includeArchived", new ParseBoolPipe({ optional: true })) includeArchived?: boolean,
  ): Promise<AccountDto[]> {
    return this.accounts.list(user.id, includeArchived ?? false);
  }

  @Post()
  @ApiOperation({ summary: "Create an account" })
  @ApiZodBody(createAccountSchema)
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createAccountSchema)) body: CreateAccountInput,
  ): Promise<AccountDto> {
    return this.accounts.create(user.id, body);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get an account" })
  get(
    @CurrentUser() user: AuthUser,
    @Param("id", new ParseUUIDPipe()) id: string,
  ): Promise<AccountDto> {
    return this.accounts.get(user.id, id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update or archive an account" })
  @ApiZodBody(updateAccountSchema)
  update(
    @CurrentUser() user: AuthUser,
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(updateAccountSchema)) body: UpdateAccountInput,
  ): Promise<AccountDto> {
    return this.accounts.update(user.id, id, body);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete an account without transactions" })
  remove(
    @CurrentUser() user: AuthUser,
    @Param("id", new ParseUUIDPipe()) id: string,
  ): Promise<void> {
    return this.accounts.remove(user.id, id);
  }
}
