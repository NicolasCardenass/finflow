import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import pg from "pg";
import { createTestApp, registerUser } from "./support/test-app.js";
import {
  createTestDatabase,
  TEST_DATABASE_URL,
  type TestDatabase,
} from "./support/test-database.js";

describe.skipIf(!TEST_DATABASE_URL)("Accounts (e2e)", () => {
  let database: TestDatabase;
  let app: INestApplication;
  let token: string;
  const http = () => request(app.getHttpServer());
  const auth = (req: request.Test, accessToken = token) =>
    req.set("Authorization", `Bearer ${accessToken}`);

  beforeAll(async () => {
    database = await createTestDatabase("accounts");
    app = await createTestApp(database.url);
    token = (await registerUser(app)).accessToken;
  });

  afterAll(async () => {
    await app?.close();
    await database?.drop();
  });

  async function createAccount(body: Record<string, unknown>, accessToken = token) {
    const response = await auth(http().post("/api/accounts"), accessToken).send(body).expect(201);
    return response.body as { id: string; balanceCents: number };
  }

  it("requires authentication", async () => {
    await http().get("/api/accounts").expect(401);
  });

  it("creates an account with defaults and an initial balance", async () => {
    const response = await auth(http().post("/api/accounts"))
      .send({ name: "Wallet", type: "cash", initialBalanceCents: 5_000 })
      .expect(201);

    expect(response.body).toMatchObject({
      name: "Wallet",
      type: "cash",
      currency: "BRL",
      initialBalanceCents: 5_000,
      balanceCents: 5_000,
      archived: false,
    });
  });

  it("rejects invalid input and duplicate names", async () => {
    await auth(http().post("/api/accounts")).send({ name: "", type: "crypto" }).expect(400);
    await createAccount({ name: "Duplicated", type: "savings" });
    await auth(http().post("/api/accounts"))
      .send({ name: "Duplicated", type: "checking" })
      .expect(409);
  });

  it("computes the balance from transactions", async () => {
    const account = await createAccount({
      name: "Checking",
      type: "checking",
      initialBalanceCents: 10_000,
    });
    // Transactions get their own endpoints later; insert them directly for now.
    const client = new pg.Client({ connectionString: database.url });
    await client.connect();
    await client.query(
      `insert into transactions (user_id, account_id, kind, amount_cents, description, occurred_on)
       select user_id, id, k, a, 'test', '2026-11-01'
       from accounts, (values ('income'::entry_kind, 2500), ('expense'::entry_kind, 4000)) v(k, a)
       where id = $1`,
      [account.id],
    );
    await client.end();

    const response = await auth(http().get(`/api/accounts/${account.id}`)).expect(200);
    expect(response.body.balanceCents).toBe(10_000 + 2_500 - 4_000);

    // Accounts with history can't be deleted, only archived.
    await auth(http().delete(`/api/accounts/${account.id}`)).expect(409);
  });

  it("updates, archives and lists accounts", async () => {
    const account = await createAccount({ name: "Old name", type: "savings" });

    const renamed = await auth(http().patch(`/api/accounts/${account.id}`))
      .send({ name: "New name", archived: true })
      .expect(200);
    expect(renamed.body).toMatchObject({ name: "New name", archived: true });

    const active = await auth(http().get("/api/accounts")).expect(200);
    expect(active.body.map((a: { id: string }) => a.id)).not.toContain(account.id);

    const all = await auth(http().get("/api/accounts?includeArchived=true")).expect(200);
    expect(all.body.map((a: { id: string }) => a.id)).toContain(account.id);

    await auth(http().patch(`/api/accounts/${account.id}`))
      .send({})
      .expect(400);
  });

  it("deletes accounts without transactions", async () => {
    const account = await createAccount({ name: "Temporary", type: "cash" });

    await auth(http().delete(`/api/accounts/${account.id}`)).expect(204);
    await auth(http().get(`/api/accounts/${account.id}`)).expect(404);
  });

  it("isolates users from each other", async () => {
    const account = await createAccount({ name: "Private", type: "cash" });
    const other = await registerUser(app);

    await auth(http().get(`/api/accounts/${account.id}`), other.accessToken).expect(404);
    await auth(http().patch(`/api/accounts/${account.id}`), other.accessToken)
      .send({ name: "Hacked" })
      .expect(404);
    await auth(http().delete(`/api/accounts/${account.id}`), other.accessToken).expect(404);
    const list = await auth(http().get("/api/accounts"), other.accessToken).expect(200);
    expect(list.body).toEqual([]);
  });

  it("validates ids", async () => {
    await auth(http().get("/api/accounts/not-a-uuid")).expect(400);
  });
});
