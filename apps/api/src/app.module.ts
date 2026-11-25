import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AccountsModule } from "./accounts/accounts.module.js";
import { AuthModule } from "./auth/auth.module.js";
import { BudgetsModule } from "./budgets/budgets.module.js";
import { CategoriesModule } from "./categories/categories.module.js";
import { validateEnv } from "./config.js";
import { ReportsModule } from "./reports/reports.module.js";
import { TransactionsModule } from "./transactions/transactions.module.js";
import { DatabaseModule } from "./database/database.module.js";
import { HealthController } from "./health/health.controller.js";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true, validate: validateEnv }),
    DatabaseModule,
    AuthModule,
    AccountsModule,
    CategoriesModule,
    TransactionsModule,
    BudgetsModule,
    ReportsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
