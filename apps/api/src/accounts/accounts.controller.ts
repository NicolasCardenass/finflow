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

@Controller("accounts")
export class AccountsController {
  constructor(private readonly accounts: AccountsService) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query("includeArchived", new ParseBoolPipe({ optional: true })) includeArchived?: boolean,
  ): Promise<AccountDto[]> {
    return this.accounts.list(user.id, includeArchived ?? false);
  }

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createAccountSchema)) body: CreateAccountInput,
  ): Promise<AccountDto> {
    return this.accounts.create(user.id, body);
  }

  @Get(":id")
  get(
    @CurrentUser() user: AuthUser,
    @Param("id", new ParseUUIDPipe()) id: string,
  ): Promise<AccountDto> {
    return this.accounts.get(user.id, id);
  }

  @Patch(":id")
  update(
    @CurrentUser() user: AuthUser,
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(updateAccountSchema)) body: UpdateAccountInput,
  ): Promise<AccountDto> {
    return this.accounts.update(user.id, id, body);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() user: AuthUser,
    @Param("id", new ParseUUIDPipe()) id: string,
  ): Promise<void> {
    return this.accounts.remove(user.id, id);
  }
}
