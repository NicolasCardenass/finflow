import type { INestApplication } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Env } from "./config.js";

/** Global HTTP settings, shared by main.ts and the end-to-end tests. */
export function configureApp(app: INestApplication): void {
  const config = app.get<ConfigService<Env, true>>(ConfigService);
  app.setGlobalPrefix("api");
  app.enableCors({ origin: config.get("CORS_ORIGINS", { infer: true }) });
  app.enableShutdownHooks();
}
