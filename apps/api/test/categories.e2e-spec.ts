import { DEFAULT_CATEGORIES } from "@finflow/shared";
import type { INestApplication } from "@nestjs/common";
import pg from "pg";
import request from "supertest";
import { createTestApp, registerUser } from "./support/test-app.js";
import {
  createTestDatabase,
  TEST_DATABASE_URL,
  type TestDatabase,
} from "./support/test-database.js";

type Category = { id: string; name: string; kind: string; color: string };

describe.skipIf(!TEST_DATABASE_URL)("Categories (e2e)", () => {
  let database: TestDatabase;
  let app: INestApplication;
  let token: string;
  const http = () => request(app.getHttpServer());
  const auth = (req: request.Test, accessToken = token) =>
    req.set("Authorization", `Bearer ${accessToken}`);

  beforeAll(async () => {
    database = await createTestDatabase("categories");
    app = await createTestApp(database.url);
    token = (await registerUser(app)).accessToken;
  });

  afterAll(async () => {
    await app?.close();
    await database?.drop();
  });

  it("gives new users the default categories", async () => {
    const response = await auth(http().get("/api/categories")).expect(200);

    expect(response.body).toHaveLength(DEFAULT_CATEGORIES.length);
    const income = await auth(http().get("/api/categories?kind=income")).expect(200);
    expect(income.body.every((c: Category) => c.kind === "income")).toBe(true);
    await auth(http().get("/api/categories?kind=other")).expect(400);
  });

  it("creates, updates and rejects duplicates per kind", async () => {
    const created = await auth(http().post("/api/categories"))
      .send({ name: "Pets", kind: "expense", color: "#AA00FF" })
      .expect(201);
    expect(created.body).toMatchObject({ name: "Pets", kind: "expense", color: "#aa00ff" });

    await auth(http().post("/api/categories")).send({ name: "Pets", kind: "expense" }).expect(409);
    // The same name is fine for the other kind.
    await auth(http().post("/api/categories")).send({ name: "Pets", kind: "income" }).expect(201);

    const updated = await auth(http().patch(`/api/categories/${created.body.id}`))
      .send({ name: "Pet care", kind: "income" })
      .expect(200);
    expect(updated.body).toMatchObject({ name: "Pet care", kind: "expense" });
  });

  it("deleting a category keeps its transactions uncategorized", async () => {
    const category = await auth(http().post("/api/categories"))
      .send({ name: "Temporary", kind: "expense" })
      .expect(201);
    const account = await auth(http().post("/api/accounts"))
      .send({ name: "Wallet", type: "cash" })
      .expect(201);
    const client = new pg.Client({ connectionString: database.url });
    await client.connect();
    const { rows } = await client.query<{ id: string }>(
      `insert into transactions (user_id, account_id, category_id, kind, amount_cents, description, occurred_on)
       select user_id, $1, id, 'expense', 1000, 'x', '2026-11-01' from categories where id = $2
       returning id`,
      [account.body.id, category.body.id],
    );

    await auth(http().delete(`/api/categories/${category.body.id}`)).expect(204);

    const after = await client.query("select category_id from transactions where id = $1", [
      rows[0]!.id,
    ]);
    await client.end();
    expect(after.rows[0].category_id).toBeNull();
    await auth(http().get(`/api/categories/${category.body.id}`)).expect(404);
  });

  it("isolates users", async () => {
    const own = await auth(http().get("/api/categories")).expect(200);
    const other = await registerUser(app);

    await auth(http().patch(`/api/categories/${own.body[0].id}`), other.accessToken)
      .send({ name: "Stolen" })
      .expect(404);
    await auth(http().delete(`/api/categories/${own.body[0].id}`), other.accessToken).expect(404);
  });
});
