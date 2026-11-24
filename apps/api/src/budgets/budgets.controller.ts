import {
  budgetsQuerySchema,
  createBudgetSchema,
  updateBudgetSchema,
  type BudgetDto,
  type CreateBudgetInput,
  type UpdateBudgetInput,
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
import { BudgetsService } from "./budgets.service.js";

const monthQuery = new ZodValidationPipe(budgetsQuerySchema);

@Controller("budgets")
export class BudgetsController {
  constructor(private readonly budgets: BudgetsService) {}

  /** Budgets of `?month=YYYY-MM` (default: current month) with spending and status. */
  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @RawQuery(monthQuery) query: { month?: string },
  ): Promise<BudgetDto[]> {
    return this.budgets.list(user.id, query.month);
  }

  /** Budgets at or above 80% of their limit, worst first. */
  @Get("alerts")
  alerts(
    @CurrentUser() user: AuthUser,
    @RawQuery(monthQuery) query: { month?: string },
  ): Promise<BudgetDto[]> {
    return this.budgets.alerts(user.id, query.month);
  }

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createBudgetSchema)) body: CreateBudgetInput,
  ): Promise<BudgetDto> {
    return this.budgets.create(user.id, body);
  }

  @Patch(":id")
  update(
    @CurrentUser() user: AuthUser,
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(updateBudgetSchema)) body: UpdateBudgetInput,
  ): Promise<BudgetDto> {
    return this.budgets.update(user.id, id, body);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() user: AuthUser,
    @Param("id", new ParseUUIDPipe()) id: string,
  ): Promise<void> {
    return this.budgets.remove(user.id, id);
  }
}
