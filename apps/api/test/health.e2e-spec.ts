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

describe("OpenAPI documentation (e2e)", () => {
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

  it("serves an OpenAPI 3.1 document generated from the Zod schemas", async () => {
    const response = await request(app.getHttpServer()).get("/api/docs-json").expect(200);
    const document = response.body;

    expect(document.openapi).toBe("3.1.0");
    expect(document.info.title).toBe("FinFlow API");
    expect(Object.keys(document.paths)).toEqual(
      expect.arrayContaining([
        "/api/auth/login",
        "/api/accounts",
        "/api/transactions",
        "/api/budgets/alerts",
        "/api/reports/monthly-trend",
      ]),
    );

    const register = document.paths["/api/auth/register"].post;
    const body = register.requestBody.content["application/json"].schema;
    expect(body.required).toEqual(expect.arrayContaining(["email", "name", "password"]));
    expect(body.properties.password.minLength).toBe(8);

    const listTransactions = document.paths["/api/transactions"].get;
    const params = listTransactions.parameters.map((p: { name: string }) => p.name);
    expect(params).toEqual(expect.arrayContaining(["page", "pageSize", "from", "to", "search"]));
    expect(document.components.securitySchemes.bearer).toMatchObject({ scheme: "bearer" });
    // Public endpoints override the global bearer requirement.
    expect(register.security).toEqual([]);
    expect(listTransactions.security).toBeUndefined();
  });

  it("serves the interactive Swagger UI", async () => {
    const response = await request(app.getHttpServer()).get("/api/docs").expect(200);
    expect(response.text).toContain("swagger-ui");
  });
});
