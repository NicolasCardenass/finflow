import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { createTestApp, registerUser } from "./support/test-app.js";
import {
  createTestDatabase,
  TEST_DATABASE_URL,
  type TestDatabase,
} from "./support/test-database.js";

type Category = { id: string; name: string };

describe.skipIf(!TEST_DATABASE_URL)("Reports (e2e)", () => {
  let database: TestDatabase;
  let app: INestApplication;
  let token: string;
  const http = () => request(app.getHttpServer());
  const get = (path: string, accessToken = token) =>
    http().get(path).set("Authorization", `Bearer ${accessToken}`);

  beforeAll(async () => {
    database = await createTestDatabase("reports");
    app = await createTestApp(database.url);
    token = (await registerUser(app)).accessToken;
    const post = (path: string, body: object) =>
      http().post(path).set("Authorization", `Bearer ${token}`).send(body).expect(201);

    const accountId = (await post("/api/accounts", { name: "Main", type: "checking" })).body.id;
    const categories: Category[] = (await get("/api/categories")).body;
    const id = (name: string) => categories.find((c) => c.name === name)!.id;
    const add = (kind: string, category: string | null, amountCents: number, occurredOn: string) =>
      post("/api/transactions", {
        accountId,
        categoryId: category && id(category),
        kind,
        amountCents,
        description: category ?? "Misc",
        occurredOn,
      });

    // October
    await add("income", "Salary", 400_000, "2026-10-05");
    await add("expense", "Housing", 150_000, "2026-10-10");
    // November
    await add("income", "Salary", 500_000, "2026-11-05");
    await add("expense", "Housing", 150_000, "2026-11-10");
    await add("expense", "Groceries", 60_000, "2026-11-12");
    await add("expense", "Groceries", 40_000, "2026-11-30");
    await add("expense", null, 50_000, "2026-11-15");
    // December (outside November)
    await add("expense", "Groceries", 99_000, "2026-12-01");
  });

  afterAll(async () => {
    await app?.close();
    await database?.drop();
  });

  it("summarizes a month and compares it with the previous one", async () => {
    const response = await get("/api/reports/monthly-summary?month=2026-11").expect(200);

    expect(response.body).toEqual({
      month: "2026-11",
      incomeCents: 500_000,
      expenseCents: 300_000,
      netCents: 200_000,
      savingsRate: 0.4,
      transactionCount: 5,
      previousMonth: {
        month: "2026-10",
        incomeCents: 400_000,
        expenseCents: 150_000,
        netCents: 250_000,
      },
    });
  });

  it("returns a null savings rate for months without income", async () => {
    const response = await get("/api/reports/monthly-summary?month=2026-12").expect(200);
    expect(response.body).toMatchObject({
      incomeCents: 0,
      expenseCents: 99_000,
      savingsRate: null,
    });
  });

  it("groups spending by category, largest first, including uncategorized", async () => {
    const response = await get(
      "/api/reports/spending-by-category?from=2026-11-01&to=2026-11-30",
    ).expect(200);

    expect(
      response.body.map(
        (r: { category: { name: string } | null; totalCents: number; share: number }) => [
          r.category?.name ?? null,
          r.totalCents,
          r.share,
        ],
      ),
    ).toEqual([
      ["Housing", 150_000, 0.5],
      ["Groceries", 100_000, 0.333],
      [null, 50_000, 0.167],
    ]);
    await get("/api/reports/spending-by-category?from=2026-11-30&to=2026-11-01").expect(400);
    await get("/api/reports/spending-by-category").expect(400);
  });

  it("builds a gap-free monthly trend", async () => {
    const response = await get("/api/reports/monthly-trend?months=4&until=2026-12").expect(200);

    expect(response.body).toEqual([
      { month: "2026-09", incomeCents: 0, expenseCents: 0, netCents: 0 },
      { month: "2026-10", incomeCents: 400_000, expenseCents: 150_000, netCents: 250_000 },
      { month: "2026-11", incomeCents: 500_000, expenseCents: 300_000, netCents: 200_000 },
      { month: "2026-12", incomeCents: 0, expenseCents: 99_000, netCents: -99_000 },
    ]);
    await get("/api/reports/monthly-trend?months=100").expect(400);
  });

  it("only includes the user's own transactions", async () => {
    const other = await registerUser(app);
    const response = await get("/api/reports/monthly-summary?month=2026-11", other.accessToken);

    expect(response.body).toMatchObject({ incomeCents: 0, expenseCents: 0, transactionCount: 0 });
  });
});
