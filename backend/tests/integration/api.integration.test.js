import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";

const runIntegration = process.env.RUN_INTEGRATION === "true";
const maybeDescribe = runIntegration ? describe : describe.skip;

maybeDescribe("API Electricity - integração", () => {
  let app;

  beforeAll(async () => {
    const module = await import("../../src/app.js");
    app = module.app;
  });

  it("responde healthcheck", async () => {
    const response = await request(app).get("/api/health").expect(200);
    expect(response.body.status).toBe("ok");
  });

  it("lista jogos persistidos no banco", async () => {
    const response = await request(app).get("/api/games").expect(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  it("cria e remove um gênero", async () => {
    const name = `Teste ${Date.now()}`;

    const created = await request(app)
      .post("/api/genres")
      .send({ name })
      .expect(201);

    expect(created.body.name).toBe(name);

    await request(app)
      .delete(`/api/genres/${created.body.id}`)
      .expect(204);
  });
});
