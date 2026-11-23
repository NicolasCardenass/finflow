import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { configureApp } from "../../src/setup.js";

/** Boot the real application against the given database. */
export async function createTestApp(databaseUrl: string): Promise<INestApplication> {
  // ConfigModule reads the environment when AppModule is first imported,
  // so set it before a dynamic import.
  process.env.DATABASE_URL = databaseUrl;
  const { AppModule } = await import("../../src/app.module.js");
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();
  configureApp(app);
  await app.init();
  return app;
}

let counter = 0;

/** Register a fresh user and return its tokens. */
export async function registerUser(app: INestApplication, overrides: { email?: string } = {}) {
  counter += 1;
  const credentials = {
    email: overrides.email ?? `user${counter}_${Date.now()}@test.dev`,
    name: `User ${counter}`,
    password: "correct-horse-battery",
  };
  const response = await request(app.getHttpServer())
    .post("/api/auth/register")
    .send(credentials)
    .expect(201);
  return { ...credentials, ...(response.body as { accessToken: string; refreshToken: string }) };
}
