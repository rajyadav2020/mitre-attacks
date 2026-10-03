const request = require("supertest");
const app = require("../../src/app");
const prisma = require("../../src/config/db");

const reg = (n) => request(app).post("/api/v1/auth/register").send({
  tenantName: `Tenant ${n}`, fullName: `Admin ${n}`,
  email: `admin${n}-${Date.now()}@test.io`, password: "Passw0rd!Passw0rd",
});

afterAll(() => prisma.$disconnect());

test("register -> /me returns tenant from token", async () => {
  const r = await reg("A");
  expect(r.status).toBe(201);
  const me = await request(app).get("/api/v1/users/me").set("Authorization", `Bearer ${r.body.accessToken}`);
  expect(me.body.tenantId).toBe(r.body.user.tenantId);
});

test("protected route without token -> 401", async () => {
  expect((await request(app).get("/api/v1/assets")).status).toBe(401);
});

test("tenant B cannot read tenant A's asset (404)", async () => {
  const a = await reg("A2"), b = await reg("B2");
  const asset = await request(app).post("/api/v1/assets")
    .set("Authorization", `Bearer ${a.body.accessToken}`).send({ hostname: "WS-1" });
  const res = await request(app).get(`/api/v1/assets/${asset.body.id}`)
    .set("Authorization", `Bearer ${b.body.accessToken}`);
  expect(res.status).toBe(404);
});

test("body tenantId is ignored", async () => {
  const a = await reg("A3"), b = await reg("B3");
  const res = await request(app).post("/api/v1/assets")
    .set("Authorization", `Bearer ${a.body.accessToken}`)
    .send({ hostname: "WS-2", tenantId: b.body.user.tenantId });
  expect(res.body.tenantId).toBe(a.body.user.tenantId);
});

test("analyst cannot create assets (403)", async () => {
  const a = await reg("A4");
  const t = a.body.accessToken;
  const u = await request(app).post("/api/v1/users").set("Authorization", `Bearer ${t}`)
    .send({ email: `t1-${Date.now()}@test.io`, fullName: "Analyst", password: "Passw0rd!Passw0rd", role: "TIER_1_ANALYST" });
  const login = await request(app).post("/api/v1/auth/login").send({ email: u.body.email, password: "Passw0rd!Passw0rd" });
  const res = await request(app).post("/api/v1/assets")
    .set("Authorization", `Bearer ${login.body.accessToken}`).send({ hostname: "X" });
  expect(res.status).toBe(403);
});

test("refresh rotates and old token reuse is rejected", async () => {
  const r = await reg("A5");
  const first = await request(app).post("/api/v1/auth/refresh").send({ refreshToken: r.body.refreshToken });
  expect(first.status).toBe(200);
  const reuse = await request(app).post("/api/v1/auth/refresh").send({ refreshToken: r.body.refreshToken });
  expect(reuse.status).toBe(401);
});