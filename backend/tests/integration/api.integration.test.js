import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";

const runIntegration = process.env.RUN_INTEGRATION === "true";
const maybeDescribe = runIntegration ? describe : describe.skip;

maybeDescribe("API Electricity - integração", () => {
  let app;
  let admin;
  let user;
  let game;

  async function login(email, password) {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email, password })
      .expect(200);
    return response.body;
  }

  beforeAll(async () => {
    process.env.NODE_ENV = "test";
    const module = await import("../../src/app.js");
    app = module.app;

    admin = await login("admin@electricity.com", "admin123");
    user = await login("user@electricity.com", "user123");
  });

  it("responde healthcheck", async () => {
    const response = await request(app).get("/api/health").expect(200);
    expect(response.body.status).toBe("ok");
  });

  it("bloqueia rotas administrativas para usuário comum", async () => {
    await request(app)
      .post("/api/games")
      .set("X-User-Id", String(user.id))
      .send({ title: "Bloqueado", price: 10 })
      .expect(403);
  });

  it("realiza CRUD de jogos como administrador", async () => {
    const title = `Jogo Integração ${Date.now()}`;

    const created = await request(app)
      .post("/api/games")
      .set("X-User-Id", String(admin.id))
      .send({
        title,
        price: 59.9,
        description: "Jogo criado em teste de integração.",
        genres: "Teste, Ação",
        platforms: "PC"
      })
      .expect(201);

    expect(created.body.title).toBe(title);
    game = created.body;

    const updated = await request(app)
      .put(`/api/games/${game.id}`)
      .set("X-User-Id", String(admin.id))
      .send({ price: 49.9 })
      .expect(200);

    expect(updated.body.price).toBe(49.9);

    const list = await request(app).get("/api/games").expect(200);
    expect(list.body.some((item) => item.id === game.id)).toBe(true);
  });


  it("cria gêneros automaticamente ao cadastrar jogo e vincula ao catálogo", async () => {
    const genreName = `Hip Hop ${Date.now()}`;
    const title = `Jogo com ${genreName}`;

    const created = await request(app)
      .post("/api/games")
      .set("X-User-Id", String(admin.id))
      .send({
        title,
        price: 39.9,
        description: "Valida criação automática de gênero e vínculo com jogo.",
        genres: genreName,
        platforms: "PC"
      })
      .expect(201);

    expect(created.body.genres).toContain(genreName);

    const genres = await request(app).get("/api/genres").expect(200);
    expect(genres.body.some((item) => item.name === genreName)).toBe(true);

    const filtered = await request(app)
      .get(`/api/games?genre=${encodeURIComponent(genreName)}`)
      .expect(200);

    expect(filtered.body.some((item) => item.id === created.body.id)).toBe(true);
  });

  it("realiza CRUD de gêneros", async () => {
    const name = `Gênero ${Date.now()}`;

    const created = await request(app)
      .post("/api/genres")
      .set("X-User-Id", String(admin.id))
      .send({ name })
      .expect(201);

    const updatedName = `${name} Editado`;
    const updated = await request(app)
      .put(`/api/genres/${created.body.id}`)
      .set("X-User-Id", String(admin.id))
      .send({ name: updatedName })
      .expect(200);

    expect(updated.body.name).toBe(updatedName);

    await request(app)
      .delete(`/api/genres/${created.body.id}`)
      .set("X-User-Id", String(admin.id))
      .expect(204);
  });

  it("realiza CRUD de plataformas", async () => {
    const name = `Plataforma ${Date.now()}`;

    const created = await request(app)
      .post("/api/platforms")
      .set("X-User-Id", String(admin.id))
      .send({ name })
      .expect(201);

    expect(created.body.name).toBe(name);

    await request(app)
      .put(`/api/platforms/${created.body.id}`)
      .set("X-User-Id", String(admin.id))
      .send({ name: `${name} Editada` })
      .expect(200);

    await request(app)
      .delete(`/api/platforms/${created.body.id}`)
      .set("X-User-Id", String(admin.id))
      .expect(204);
  });

  it("realiza CRUD de promoções", async () => {
    const created = await request(app)
      .post("/api/promotions")
      .set("X-User-Id", String(admin.id))
      .send({
        gameId: game.id,
        discountPercentage: 15,
        startDate: "2026-01-01",
        endDate: "2026-12-31"
      })
      .expect(201);

    expect(created.body.discountPercentage).toBe(15);

    await request(app)
      .put(`/api/promotions/${created.body.id}`)
      .set("X-User-Id", String(admin.id))
      .send({
        gameId: game.id,
        discountPercentage: 25,
        startDate: "2026-01-01",
        endDate: "2026-12-31",
        isActive: true
      })
      .expect(200);

    await request(app)
      .delete(`/api/promotions/${created.body.id}`)
      .set("X-User-Id", String(admin.id))
      .expect(204);
  });

  it("permite visitante adicionar ao carrinho e bloqueia duplicidade", async () => {
    const guestCart = `guest-test-${Date.now()}`;

    await request(app)
      .post("/api/cart/items")
      .set("X-Guest-Cart-Id", guestCart)
      .send({ gameId: game.id })
      .expect(201);

    await request(app)
      .post("/api/cart/items")
      .set("X-Guest-Cart-Id", guestCart)
      .send({ gameId: game.id })
      .expect(409);

    const cart = await request(app)
      .get("/api/cart")
      .set("X-Guest-Cart-Id", guestCart)
      .expect(200);

    expect(cart.body.items.length).toBe(1);
  });

  it("exige login para checkout", async () => {
    await request(app)
      .post("/api/orders/checkout")
      .expect(401);
  });

  it("finaliza compra e adiciona jogo à biblioteca", async () => {
    const email = `checkout-${Date.now()}@electricity.com`;
    const registered = await request(app)
      .post("/api/auth/register")
      .send({ name: "Cliente Checkout", email, password: "user123" })
      .expect(201);

    await request(app)
      .post("/api/cart/items")
      .set("X-User-Id", String(registered.body.id))
      .send({ gameId: game.id })
      .expect(201);

    const order = await request(app)
      .post("/api/orders/checkout")
      .set("X-User-Id", String(registered.body.id))
      .expect(201);

    expect(order.body.items.length).toBe(1);

    const library = await request(app)
      .get("/api/library")
      .set("X-User-Id", String(registered.body.id))
      .expect(200);

    expect(library.body.some((item) => item.id === game.id)).toBe(true);
  });

  it("gerencia lista de desejos", async () => {
    const added = await request(app)
      .post(`/api/wishlist/${game.id}`)
      .set("X-User-Id", String(user.id))
      .expect(201);

    expect(added.body.title).toBe(game.title);

    const list = await request(app)
      .get("/api/wishlist")
      .set("X-User-Id", String(user.id))
      .expect(200);

    expect(list.body.some((item) => item.id === game.id)).toBe(true);

    await request(app)
      .delete(`/api/wishlist/${game.id}`)
      .set("X-User-Id", String(user.id))
      .expect(204);
  });

  it("permite editar perfil do usuário logado", async () => {
    const newName = `Usuário Teste ${Date.now()}`;

    const response = await request(app)
      .put("/api/auth/me")
      .set("X-User-Id", String(user.id))
      .send({ name: newName, email: user.email })
      .expect(200);

    expect(response.body.name).toBe(newName);
  });

  it("permite admin listar e editar usuários", async () => {
    const users = await request(app)
      .get("/api/users")
      .set("X-User-Id", String(admin.id))
      .expect(200);

    expect(Array.isArray(users.body)).toBe(true);

    const updated = await request(app)
      .put(`/api/users/${user.id}`)
      .set("X-User-Id", String(admin.id))
      .send({ name: user.name, email: user.email, role: "USER" })
      .expect(200);

    expect(updated.body.role).toBe("USER");
  });
});
