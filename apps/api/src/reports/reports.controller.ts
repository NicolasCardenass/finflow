import {
  monthQuerySchema,
  rangeQuerySchema,
  trendQuerySchema,
  type CategorySpendingDto,
  type MonthlySummaryDto,
  type MonthlyTrendPointDto,
} from "@finflow/shared";
import { Controller, Get } from "@nestjs/common";
import { CurrentUser, type AuthUser } from "../auth/current-user.decorator.js";
import { RawQuery } from "../common/query.decorator.js";
import { ZodValidationPipe } from "../common/zod-validation.pipe.js";
import { ReportsService } from "./reports.service.js";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { ApiZodQuery } from "../common/openapi.js";

@ApiTags("Reports")
@Controller("reports")
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get("monthly-summary")
  @ApiOperation({ summary: "Income, expenses and savings rate of a month" })
  @ApiZodQuery(monthQuerySchema)
  monthlySummary(
    @CurrentUser() user: AuthUser,
    @RawQuery(new ZodValidationPipe(monthQuerySchema)) query: { month?: string },
  ): Promise<MonthlySummaryDto> {
    return this.reports.monthlySummary(user.id, query.month);
  }

  @Get("spending-by-category")
  @ApiOperation({ summary: "Expenses per category in a date range" })
  @ApiZodQuery(rangeQuerySchema)
  spendingByCategory(
    @CurrentUser() user: AuthUser,
    @RawQuery(new ZodValidationPipe(rangeQuerySchema)) query: { from: string; to: string },
  ): Promise<CategorySpendingDto[]> {
    return this.reports.spendingByCategory(user.id, query.from, query.to);
  }

  @Get("monthly-trend")
  @ApiOperation({ summary: "Monthly income, expenses and net result" })
  @ApiZodQuery(trendQuerySchema)
  monthlyTrend(
    @CurrentUser() user: AuthUser,
    @RawQuery(new ZodValidationPipe(trendQuerySchema)) query: { months: number; until?: string },
  ): Promise<MonthlyTrendPointDto[]> {
    return this.reports.monthlyTrend(user.id, query.months, query.until);
  }
}
