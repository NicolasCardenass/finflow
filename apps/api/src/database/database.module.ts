import { Global, Inject, Module, type OnApplicationShutdown } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type pg from "pg";
import type { Env } from "../config.js";
import { createDatabase, createPool } from "./client.js";

export const PG_POOL = Symbol("PG_POOL");
export const DATABASE = Symbol("DATABASE");

/** Provides the Drizzle database (inject with `@Inject(DATABASE)`). */
@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) =>
        createPool(config.get("DATABASE_URL", { infer: true })),
    },
    {
      provide: DATABASE,
      inject: [PG_POOL],
      useFactory: createDatabase,
    },
  ],
  exports: [DATABASE],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(@Inject(PG_POOL) private readonly pool: pg.Pool) {}

  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }
}
