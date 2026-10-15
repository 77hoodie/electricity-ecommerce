import { randomUUID } from "node:crypto";
import request from "supertest";
import { describe, expect, it } from "vitest";

const maybeDescribe = process.env.RUN_INTEGRATION === "true" ? describe : describe.skip;

maybeDescribe("Checkout em lote com PostgreSQL", () => {
  it("mantém preços do carrinho, evita duplicação na biblioteca e limpa o carrinho", async () => {
    const { app } = await import("../../src/app.js");
    const { prisma } = await import("../../src/prisma.js");
    const suffix = randomUUID();
    const user = await prisma.user.create({
      data: {
        name: `Cliente checkout ${suffix}`,
        email: `checkout-${suffix}@electricity.test`,
        passwordHash: "teste-automatico"
      }
    });
    const gameIds = [];

    try {
      const prices = [44.9, 25.0, 13.4];
      for (const [index, price] of prices.entries()) {
        const game = await prisma.game.create({
          data: {
            title: `Checkout lote ${suffix} ${index}`,
            description: "Jogo de teste do checkout",
            price,
            genres: [],
            platforms: [],
            isActive: true
          }
        });
        gameIds.push(game.id);
      }

      const alreadyOwned = await prisma.libraryItem.create({
        data: {
          userId: user.id,
          gameId: gameIds[0],
          purchasedAt: new Date("2025-01-01T12:00:00.000Z")
        }
      });

      const cartPrices = [18.5, 31.75, 12.2];
      await prisma.cartItem.createMany({
        data: gameIds.map((gameId, index) => ({
          userId: user.id,
          gameId,
          priceAtMoment: cartPrices[index]
        }))
      });

      await prisma.game.update({
        where: { id: gameIds[1] },
        data: { price: 99.9 }
      });

      const response = await request(app)
        .post("/api/orders/checkout")
        .set("X-User-Id", String(user.id))
        .expect(201);

      expect(response.body.status).toBe("PAID");
      expect(response.body.total).toBeCloseTo(62.45, 2);
      expect(response.body.items).toHaveLength(3);
      const pricesByGame = new Map(
        response.body.items.map((item) => [item.gameId, item.priceAtPurchase])
      );
      for (const [index, gameId] of gameIds.entries()) {
        expect(pricesByGame.get(gameId)).toBeCloseTo(cartPrices[index], 2);
      }

      const library = await prisma.libraryItem.findMany({
        where: { userId: user.id }
      });
      expect(library).toHaveLength(3);
      expect(new Set(library.map((item) => item.gameId))).toEqual(new Set(gameIds));
      const kept = library.find((item) => item.gameId === gameIds[0]);
      expect(kept.id).toBe(alreadyOwned.id);
      expect(kept.purchasedAt.getTime()).toBe(alreadyOwned.purchasedAt.getTime());
      expect(await prisma.cartItem.count({ where: { userId: user.id } })).toBe(0);
      expect(await prisma.order.count({ where: { userId: user.id } })).toBe(1);

      await request(app)
        .post("/api/orders/checkout")
        .set("X-User-Id", String(user.id))
        .expect(400);
      expect(await prisma.order.count({ where: { userId: user.id } })).toBe(1);
    } finally {
      await prisma.order.deleteMany({ where: { userId: user.id } });
      await prisma.cartItem.deleteMany({ where: { userId: user.id } });
      await prisma.libraryItem.deleteMany({ where: { userId: user.id } });
      if (gameIds.length > 0) {
        await prisma.game.deleteMany({ where: { id: { in: gameIds } } });
      }
      await prisma.user.delete({ where: { id: user.id } });
    }
  }, 15000);

  it("rejeita checkout sem autenticação e não cria pedido", async () => {
    const { app } = await import("../../src/app.js");
    await request(app).post("/api/orders/checkout").expect(401);
  });

  it("rejeita carrinho vazio sem gerar pedido", async () => {
    const { app } = await import("../../src/app.js");
    const { prisma } = await import("../../src/prisma.js");
    const suffix = randomUUID();
    const user = await prisma.user.create({
      data: {
        name: `Checkout vazio ${suffix}`,
        email: `checkout-vazio-${suffix}@electricity.test`,
        passwordHash: "teste-automatico"
      }
    });

    try {
      await request(app)
        .post("/api/orders/checkout")
        .set("X-User-Id", String(user.id))
        .expect(400);
      expect(await prisma.order.count({ where: { userId: user.id } })).toBe(0);
    } finally {
      await prisma.user.delete({ where: { id: user.id } });
    }
  }, 15000);
});
