import "reflect-metadata";
import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";
import type { Env } from "./config.js";
import { configureApp } from "./setup.js";

const app = await NestFactory.create(AppModule);
configureApp(app);

const port = app.get<ConfigService<Env, true>>(ConfigService).get("PORT", { infer: true });
await app.listen(port);
Logger.log(`FinFlow API listening on http://localhost:${port}/api`, "Bootstrap");
