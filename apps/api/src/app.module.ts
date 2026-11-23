import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AccountsModule } from "./accounts/accounts.module.js";
import { AuthModule } from "./auth/auth.module.js";
import { validateEnv } from "./config.js";
import { DatabaseModule } from "./database/database.module.js";
import { HealthController } from "./health/health.controller.js";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true, validate: validateEnv }),
    DatabaseModule,
    AuthModule,
    AccountsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
