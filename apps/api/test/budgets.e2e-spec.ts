import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { createTestApp, registerUser } from "./support/test-app.js";
import {
  createTestDatabase,
  TEST_DATABASE_URL,
  type TestDatabase,
} from "./support/test-database.js";

type Category = { id: string; name: string };

describe.skipIf(!TEST_DATABASE_URL)("Budgets (e2e)", () => {
  let database: TestDatabase;
  let app: INestApplication;
  let token: string;
  let accountId: string;
  let byName: (name: string) => string;
  const http = () => request(app.getHttpServer());
  const auth = (req: request.Test, accessToken = token) =>
    req.set("Authorization", `Bearer ${accessToken}`);

  const spend = (category: string, amountCents: number, occurredOn: string) =>
    auth(http().post("/api/transactions"))
      .send({
        accountId,
        categoryId: byName(category),
        kind: "expense",
        amountCents,
        description: category,
        occurredOn,
      })
      .expect(201);

  beforeAll(async () => {
    database = await createTestDatabase("budgets");
    app = await createTestApp(database.url);
    token = (await registerUser(app)).accessToken;
    accountId = (await auth(http().post("/api/accounts")).send({ name: "Main", type: "checking" }))
      .body.id;
    const categories: Category[] = (await auth(http().get("/api/categories"))).body;
    byName = (name) => categories.find((c) => c.name === name)!.id;

    for (const [category, limitCents] of [
      ["Groceries", 100_000],
      ["Restaurants", 20_000],
      ["Transport", 30_000],
    ] as const) {
      await auth(http().post("/api/budgets"))
        .send({ categoryId: byName(category), month: "2026-11", limitCents })
        .expect(201);
    }

    await spend("Groceries", 30_000, "2026-11-03"); // 30% → ok
    await spend("Restaurants", 12_000, "2026-11-04");
    await spend("Restaurants", 5_000, "2026-11-20"); // 85% → warning
    await spend("Transport", 35_000, "2026-11-30"); // 117% → exceeded
    await spend("Transport", 99_000, "2026-10-31"); // previous month: ignored
    await spend("Transport", 99_000, "2026-12-01"); // next month: ignored
  });

  afterAll(async () => {
    await app?.close();
    await database?.drop();
  });

  it("reports spending, remaining amount and status per budget", async () => {
    const response = await auth(http().get("/api/budgets?month=2026-11")).expect(200);

    const summary = response.body.map(
      (b: {
        category: { name: string };
        spentCents: number;
        remainingCents: number;
        status: string;
      }) => [b.category.name, b.spentCents, b.remainingCents, b.status],
    );
    expect(summary).toEqual([
      ["Groceries", 30_000, 70_000, "ok"],
      ["Restaurants", 17_000, 3_000, "warning"],
      ["Transport", 35_000, -5_000, "exceeded"],
    ]);
    expect(response.body[1].usage).toBe(0.85);
  });

  it("lists alerts, worst first", async () => {
    const response = await auth(http().get("/api/budgets/alerts?month=2026-11")).expect(200);

    expect(response.body.map((b: { category: { name: string } }) => b.category.name)).toEqual([
      "Transport",
      "Restaurants",
    ]);
  });

  it("returns an empty list for months without budgets", async () => {
    const response = await auth(http().get("/api/budgets?month=2026-01")).expect(200);
    expect(response.body).toEqual([]);
  });

  it("enforces one budget per category and month, expense categories only", async () => {
    await auth(http().post("/api/budgets"))
      .send({ categoryId: byName("Groceries"), month: "2026-11", limitCents: 1 })
      .expect(409);
    await auth(http().post("/api/budgets"))
      .send({ categoryId: byName("Salary"), month: "2026-11", limitCents: 1 })
      .expect(422);
    await auth(http().post("/api/budgets"))
      .send({ categoryId: byName("Groceries"), month: "2026-13", limitCents: 1 })
      .expect(400);
  });

  it("updates the limit and recomputes the status", async () => {
    const [transport] = (await auth(http().get("/api/budgets/alerts?month=2026-11"))).body;

    const updated = await auth(http().patch(`/api/budgets/${transport.id}`))
      .send({ limitCents: 50_000 })
      .expect(200);

    expect(updated.body).toMatchObject({ limitCents: 50_000, status: "ok", usage: 0.7 });
  });

  it("deletes budgets and isolates users", async () => {
    const created = await auth(http().post("/api/budgets"))
      .send({ categoryId: byName("Leisure"), month: "2026-11", limitCents: 10_000 })
      .expect(201);
    const other = await registerUser(app);

    await auth(http().delete(`/api/budgets/${created.body.id}`), other.accessToken).expect(404);
    expect((await auth(http().get("/api/budgets?month=2026-11"), other.accessToken)).body).toEqual(
      [],
    );
    await auth(http().delete(`/api/budgets/${created.body.id}`)).expect(204);
  });
});
