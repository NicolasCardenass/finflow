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
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { ApiZodBody, ApiZodQuery } from "../common/openapi.js";

const monthQuery = new ZodValidationPipe(budgetsQuerySchema);

@ApiTags("Budgets")
@Controller("budgets")
export class BudgetsController {
  constructor(private readonly budgets: BudgetsService) {}

  /** Budgets of `?month=YYYY-MM` (default: current month) with spending and status. */
  @Get()
  @ApiOperation({ summary: "Budgets of a month with spending and status" })
  @ApiZodQuery(budgetsQuerySchema)
  list(
    @CurrentUser() user: AuthUser,
    @RawQuery(monthQuery) query: { month?: string },
  ): Promise<BudgetDto[]> {
    return this.budgets.list(user.id, query.month);
  }

  /** Budgets at or above 80% of their limit, worst first. */
  @Get("alerts")
  @ApiOperation({ summary: "Budgets at 80% or more of their limit" })
  @ApiZodQuery(budgetsQuerySchema)
  alerts(
    @CurrentUser() user: AuthUser,
    @RawQuery(monthQuery) query: { month?: string },
  ): Promise<BudgetDto[]> {
    return this.budgets.alerts(user.id, query.month);
  }

  @Post()
  @ApiOperation({ summary: "Set a monthly budget for an expense category" })
  @ApiZodBody(createBudgetSchema)
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createBudgetSchema)) body: CreateBudgetInput,
  ): Promise<BudgetDto> {
    return this.budgets.create(user.id, body);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Change a budget limit" })
  @ApiZodBody(updateBudgetSchema)
  update(
    @CurrentUser() user: AuthUser,
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(updateBudgetSchema)) body: UpdateBudgetInput,
  ): Promise<BudgetDto> {
    return this.budgets.update(user.id, id, body);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete a budget" })
  remove(
    @CurrentUser() user: AuthUser,
    @Param("id", new ParseUUIDPipe()) id: string,
  ): Promise<void> {
    return this.budgets.remove(user.id, id);
  }
}
