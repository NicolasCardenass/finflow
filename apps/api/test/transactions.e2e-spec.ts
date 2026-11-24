import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { createTestApp, registerUser } from "./support/test-app.js";
import {
  createTestDatabase,
  TEST_DATABASE_URL,
  type TestDatabase,
} from "./support/test-database.js";

type Category = { id: string; name: string; kind: string };

describe.skipIf(!TEST_DATABASE_URL)("Transactions (e2e)", () => {
  let database: TestDatabase;
  let app: INestApplication;
  let token: string;
  let accountId: string;
  let salary: Category;
  let groceries: Category;
  const http = () => request(app.getHttpServer());
  const auth = (req: request.Test, accessToken = token) =>
    req.set("Authorization", `Bearer ${accessToken}`);

  const create = (body: Record<string, unknown>) =>
    auth(http().post("/api/transactions")).send({ accountId, ...body });

  beforeAll(async () => {
    database = await createTestDatabase("transactions");
    app = await createTestApp(database.url);
    token = (await registerUser(app)).accessToken;
    accountId = (
      await auth(http().post("/api/accounts")).send({ name: "Checking", type: "checking" })
    ).body.id;
    const categories: Category[] = (await auth(http().get("/api/categories"))).body;
    salary = categories.find((c) => c.name === "Salary")!;
    groceries = categories.find((c) => c.name === "Groceries")!;

    // 25 expenses spread over November plus one salary.
    for (let day = 1; day <= 25; day++) {
      await create({
        kind: "expense",
        categoryId: groceries.id,
        amountCents: day * 100,
        description: day % 5 === 0 ? `Supermarket 100% organic #${day}` : `Market #${day}`,
        occurredOn: `2026-11-${String(day).padStart(2, "0")}`,
      }).expect(201);
    }
    await create({
      kind: "income",
      categoryId: salary.id,
      amountCents: 500_000,
      description: "Salary",
      occurredOn: "2026-11-05",
    }).expect(201);
  });

  afterAll(async () => {
    await app?.close();
    await database?.drop();
  });

  it("creates a transaction with its account and category", async () => {
    const response = await create({
      kind: "expense",
      categoryId: groceries.id,
      amountCents: 1999,
      description: "Bakery",
      occurredOn: "2026-10-31",
      notes: "Bread",
    }).expect(201);

    expect(response.body).toMatchObject({
      kind: "expense",
      amountCents: 1999,
      occurredOn: "2026-10-31",
      account: { id: accountId, name: "Checking" },
      category: { id: groceries.id, name: "Groceries" },
    });
    await auth(http().delete(`/api/transactions/${response.body.id}`)).expect(204);
  });

  it("paginates newest first by default", async () => {
    const first = await auth(http().get("/api/transactions?pageSize=10")).expect(200);

    expect(first.body).toMatchObject({ page: 1, pageSize: 10, total: 26, totalPages: 3 });
    expect(first.body.items).toHaveLength(10);
    expect(first.body.items[0].occurredOn).toBe("2026-11-25");

    const last = await auth(http().get("/api/transactions?pageSize=10&page=3")).expect(200);
    expect(last.body.items).toHaveLength(6);
  });

  it("filters by date range, kind, category and search text", async () => {
    const range = await auth(
      http().get("/api/transactions?from=2026-11-10&to=2026-11-12&sort=date_asc"),
    ).expect(200);
    expect(range.body.items.map((t: { occurredOn: string }) => t.occurredOn)).toEqual([
      "2026-11-10",
      "2026-11-11",
      "2026-11-12",
    ]);

    const income = await auth(http().get("/api/transactions?kind=income")).expect(200);
    expect(income.body.total).toBe(1);

    const byCategory = await auth(http().get(`/api/transactions?categoryId=${salary.id}`)).expect(
      200,
    );
    expect(byCategory.body.items[0].description).toBe("Salary");

    // "%" is matched literally, not as a wildcard.
    const search = await auth(http().get("/api/transactions?search=100%25")).expect(200);
    expect(search.body.total).toBe(5);
  });

  it("sorts by amount", async () => {
    const response = await auth(
      http().get("/api/transactions?kind=expense&sort=amount_desc&pageSize=3"),
    ).expect(200);
    expect(response.body.items.map((t: { amountCents: number }) => t.amountCents)).toEqual([
      2500, 2400, 2300,
    ]);
  });

  it("validates queries and bodies", async () => {
    await auth(http().get("/api/transactions?from=2026-12-01&to=2026-11-01")).expect(400);
    await auth(http().get("/api/transactions?pageSize=1000")).expect(400);
    await create({
      kind: "expense",
      amountCents: -5,
      description: "x",
      occurredOn: "2026-11-01",
    }).expect(400);
  });

  it("rejects categories of the wrong kind and foreign or archived accounts", async () => {
    const wrongKind = await create({
      kind: "expense",
      categoryId: salary.id,
      amountCents: 100,
      description: "x",
      occurredOn: "2026-11-01",
    }).expect(422);
    expect(wrongKind.body.message).toMatch(/can't use a category meant for income/);

    const other = await registerUser(app);
    const otherAccount = (
      await auth(http().post("/api/accounts"), other.accessToken).send({
        name: "Theirs",
        type: "cash",
      })
    ).body.id;
    await create({
      accountId: otherAccount,
      kind: "expense",
      amountCents: 100,
      description: "x",
      occurredOn: "2026-11-01",
    }).expect(400);

    const archived = (await auth(http().post("/api/accounts")).send({ name: "Old", type: "cash" }))
      .body.id;
    await auth(http().patch(`/api/accounts/${archived}`))
      .send({ archived: true })
      .expect(200);
    await create({
      accountId: archived,
      kind: "expense",
      amountCents: 100,
      description: "x",
      occurredOn: "2026-11-01",
    }).expect(422);
  });

  it("updates fields and re-validates the category against the kind", async () => {
    const created = await create({
      kind: "expense",
      categoryId: groceries.id,
      amountCents: 1000,
      description: "Lunch",
      occurredOn: "2026-11-20",
    }).expect(201);
    const id = created.body.id;

    const updated = await auth(http().patch(`/api/transactions/${id}`))
      .send({ amountCents: 1500, categoryId: null })
      .expect(200);
    expect(updated.body).toMatchObject({ amountCents: 1500, category: null, description: "Lunch" });

    await auth(http().patch(`/api/transactions/${id}`))
      .send({ categoryId: salary.id })
      .expect(422);
    await auth(http().patch(`/api/transactions/${id}`))
      .send({ kind: "income", categoryId: salary.id })
      .expect(200);
  });

  it("keeps the account balance in sync", async () => {
    const account = await auth(http().get(`/api/accounts/${accountId}`)).expect(200);
    const all = await auth(http().get(`/api/transactions?accountId=${accountId}&pageSize=100`));
    const expected = all.body.items.reduce(
      (sum: number, t: { kind: string; amountCents: number }) =>
        sum + (t.kind === "income" ? t.amountCents : -t.amountCents),
      0,
    );
    expect(account.body.balanceCents).toBe(expected);
  });

  it("isolates users", async () => {
    const mine = await auth(http().get("/api/transactions?pageSize=1")).expect(200);
    const other = await registerUser(app);

    const theirs = await auth(http().get("/api/transactions"), other.accessToken).expect(200);
    expect(theirs.body.total).toBe(0);
    await auth(http().get(`/api/transactions/${mine.body.items[0].id}`), other.accessToken).expect(
      404,
    );
  });
});
