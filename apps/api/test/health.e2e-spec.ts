import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module.js";
import { API_VERSION } from "../src/health/health.controller.js";
import { configureApp } from "../src/setup.js";

describe("Health (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /api/health reports status and version", async () => {
    const response = await request(app.getHttpServer()).get("/api/health").expect(200);

    expect(response.body).toMatchObject({ status: "ok", version: API_VERSION });
    expect(response.body.uptimeSeconds).toBeGreaterThanOrEqual(0);
  });

  it("allows the configured frontend origin", async () => {
    const response = await request(app.getHttpServer())
      .get("/api/health")
      .set("Origin", "http://localhost:3000")
      .expect(200);

    expect(response.headers["access-control-allow-origin"]).toBe("http://localhost:3000");
  });

  it("returns 404 for unknown routes", async () => {
    await request(app.getHttpServer()).get("/api/unknown").expect(404);
  });
});
