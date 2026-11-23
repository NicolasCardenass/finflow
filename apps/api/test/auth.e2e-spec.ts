import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { createTestApp, registerUser } from "./support/test-app.js";
import {
  createTestDatabase,
  TEST_DATABASE_URL,
  type TestDatabase,
} from "./support/test-database.js";

describe.skipIf(!TEST_DATABASE_URL)("Auth (e2e)", () => {
  let database: TestDatabase;
  let app: INestApplication;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    database = await createTestDatabase("auth");
    app = await createTestApp(database.url);
  });

  afterAll(async () => {
    await app?.close();
    await database?.drop();
  });

  it("registers a user and returns tokens without the password hash", async () => {
    const response = await http()
      .post("/api/auth/register")
      .send({ email: "  Ana@Example.com ", name: "Ana", password: "s3cret-pass" })
      .expect(201);

    expect(response.body.user).toMatchObject({ email: "ana@example.com", name: "Ana" });
    expect(response.body.user).not.toHaveProperty("passwordHash");
    expect(response.body).toMatchObject({ tokenType: "Bearer", expiresIn: 900 });
    expect(response.body.accessToken.split(".")).toHaveLength(3);
    expect(typeof response.body.refreshToken).toBe("string");
  });

  it("rejects duplicate emails regardless of case", async () => {
    await registerUser(app, { email: "dup@test.dev" });

    const response = await http()
      .post("/api/auth/register")
      .send({ email: "DUP@test.dev", name: "Other", password: "another-pass" })
      .expect(409);
    expect(response.body.message).toMatch(/already exists/);
  });

  it("validates input with field errors", async () => {
    const response = await http()
      .post("/api/auth/register")
      .send({ email: "nope", name: "", password: "123" })
      .expect(400);

    const paths = response.body.errors.map((e: { path: string }) => e.path);
    expect(paths).toEqual(expect.arrayContaining(["email", "name", "password"]));
  });

  it("logs in with valid credentials and rejects invalid ones generically", async () => {
    const user = await registerUser(app);

    await http()
      .post("/api/auth/login")
      .send({ email: user.email.toUpperCase(), password: user.password })
      .expect(200);

    const wrongPassword = await http()
      .post("/api/auth/login")
      .send({ email: user.email, password: "wrong-password" })
      .expect(401);
    const unknownEmail = await http()
      .post("/api/auth/login")
      .send({ email: "nobody@test.dev", password: "wrong-password" })
      .expect(401);
    expect(wrongPassword.body.message).toBe(unknownEmail.body.message);
  });

  it("protects routes with the access token", async () => {
    const user = await registerUser(app);

    await http().get("/api/auth/me").expect(401);
    await http().get("/api/auth/me").set("Authorization", "Bearer not-a-jwt").expect(401);
    const me = await http()
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${user.accessToken}`)
      .expect(200);
    expect(me.body.email).toBe(user.email);

    await http().get("/api/health").expect(200); // public
  });

  it("rotates refresh tokens and detects reuse", async () => {
    const user = await registerUser(app);

    const first = await http()
      .post("/api/auth/refresh")
      .send({ refreshToken: user.refreshToken })
      .expect(200);
    expect(first.body.refreshToken).not.toBe(user.refreshToken);

    // Replaying the old token revokes every session of the user...
    const reuse = await http()
      .post("/api/auth/refresh")
      .send({ refreshToken: user.refreshToken })
      .expect(401);
    expect(reuse.body.message).toMatch(/reuse detected/);

    // ...including the token issued by the legitimate refresh.
    await http()
      .post("/api/auth/refresh")
      .send({ refreshToken: first.body.refreshToken })
      .expect(401);
  });

  it("logout revokes the refresh token", async () => {
    const user = await registerUser(app);

    await http().post("/api/auth/logout").send({ refreshToken: user.refreshToken }).expect(204);
    await http().post("/api/auth/refresh").send({ refreshToken: user.refreshToken }).expect(401);
  });

  it("rejects unknown refresh tokens", async () => {
    await http()
      .post("/api/auth/refresh")
      .send({ refreshToken: "x".repeat(43) })
      .expect(401);
  });
});
