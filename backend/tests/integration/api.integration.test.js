import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";

const runIntegration = process.env.RUN_INTEGRATION === "true";
const maybeDescribe = runIntegration ? describe : describe.skip;

maybeDescribe("API Electricity - integração", () => {
  let app;
  let admin;

  beforeAll(async () => {
    const module = await import("../../src/app.js");
    app = module.app;

    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin@electricity.com", password: "admin123" })
      .expect(200);

    admin = login.body;
  });

  it("responde healthcheck", async () => {
    const response = await request(app).get("/api/health").expect(200);
    expect(response.body.status).toBe("ok");
  });

  it("lista jogos persistidos no banco", async () => {
    const response = await request(app).get("/api/games").expect(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  it("realiza login com usuário admin", async () => {
    expect(admin.email).toBe("admin@electricity.com");
    expect(admin.role).toBe("ADMIN");
  });

  it("cria e remove um gênero como administrador", async () => {
    const name = `Teste ${Date.now()}`;

    const created = await request(app)
      .post("/api/genres")
      .set("X-User-Id", String(admin.id))
      .send({ name })
      .expect(201);

    expect(created.body.name).toBe(name);

    await request(app)
      .delete(`/api/genres/${created.body.id}`)
      .set("X-User-Id", String(admin.id))
      .expect(204);
  });

  it("bloqueia checkout sem login", async () => {
    await request(app)
      .post("/api/orders/checkout")
      .expect(401);
  });
});
