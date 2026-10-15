import { randomUUID } from "node:crypto";
import request from "supertest";
import { describe, expect, it } from "vitest";

const maybeDescribe = process.env.RUN_INTEGRATION === "true" ? describe : describe.skip;

maybeDescribe("Mesclagem do carrinho visitante com PostgreSQL", () => {
  it("mescla somente jogos elegíveis, mantém preços e contadores e limpa a sessão", async () => {
    const { app } = await import("../../src/app.js");
    const { prisma } = await import("../../src/prisma.js");
    const runId = randomUUID();
    const sessionId = `merge-${runId}`;
    const user = await prisma.user.create({
      data: {
        name: `Cliente merge ${runId}`,
        email: `merge-${runId}@electricity.test`,
        passwordHash: "teste"
      }
    });
    const gameIds = [];

    try {
      for (let index = 0; index < 5; index += 1) {
        const game = await prisma.game.create({
          data: {
            title: `Jogo merge ${runId} ${index}`,
            description: "Teste de mesclagem",
            price: 99.9,
            genres: [],
            platforms: [],
            isActive: index !== 3
          }
        });
        gameIds.push(game.id);
      }

      await prisma.cartItem.create({
        data: { userId: user.id, gameId: gameIds[1], priceAtMoment: 88.88 }
      });
      const existingOwned = await prisma.libraryItem.create({
        data: { userId: user.id, gameId: gameIds[2] }
      });
      const prices = [12.5, 18.25, 9.75, 22.35, 23.25];
      await prisma.cartItem.createMany({
        data: gameIds.map((gameId, index) => ({
          sessionId,
          gameId,
          priceAtMoment: prices[index]
        }))
      });

      const response = await request(app)
        .post("/api/cart/merge-guest")
        .set("X-User-Id", String(user.id))
        .set("X-Guest-Cart-Id", sessionId)
        .expect(200);

      expect(response.body.merged).toBe(2);
      expect(response.body.skipped).toBe(3);
      expect(response.body.items).toHaveLength(3);
      expect(response.body.total).toBeCloseTo(124.63, 2);
      const pricesByGame = new Map(response.body.items.map((item) => [item.gameId, item.priceAtMoment]));
      expect(pricesByGame.get(gameIds[0])).toBeCloseTo(12.5, 2);
      expect(pricesByGame.get(gameIds[1])).toBeCloseTo(88.88, 2);
      expect(pricesByGame.get(gameIds[4])).toBeCloseTo(23.25, 2);
      expect(pricesByGame.has(gameIds[2])).toBe(false);
      expect(pricesByGame.has(gameIds[3])).toBe(false);
      expect(await prisma.cartItem.count({ where: { sessionId } })).toBe(0);
      const owned = await prisma.libraryItem.findMany({ where: { userId: user.id } });
      expect(owned).toHaveLength(1);
      expect(owned[0].id).toBe(existingOwned.id);

      const repeated = await request(app)
        .post("/api/cart/merge-guest")
        .set("X-User-Id", String(user.id))
        .set("X-Guest-Cart-Id", sessionId)
        .expect(200);
      expect(repeated.body.merged).toBe(0);
      expect(repeated.body.skipped).toBe(0);
      expect(repeated.body.items).toHaveLength(3);
    } finally {
      await prisma.cartItem.deleteMany({ where: { OR: [{ userId: user.id }, { sessionId }] } });
      await prisma.libraryItem.deleteMany({ where: { userId: user.id } });
      await prisma.game.deleteMany({ where: { id: { in: gameIds } } });
      await prisma.user.delete({ where: { id: user.id } });
    }
  }, 15000);

  it("mantém o carrinho de outra sessão e rejeita acesso sem autenticação", async () => {
    const { app } = await import("../../src/app.js");
    const { prisma } = await import("../../src/prisma.js");
    const runId = randomUUID();
    const sessionId = `merge-${runId}`;
    const otherSessionId = `merge-outra-${runId}`;
    const user = await prisma.user.create({
      data: {
        name: `Cliente sem itens ${runId}`,
        email: `merge-vazio-${runId}@electricity.test`,
        passwordHash: "teste"
      }
    });
    let game;

    try {
      game = await prisma.game.create({
        data: {
          title: `Outro carrinho ${runId}`,
          description: "Sessão independente",
          price: 9.9,
          genres: [],
          platforms: []
        }
      });
      await prisma.cartItem.create({
        data: { sessionId: otherSessionId, gameId: game.id, priceAtMoment: 7.5 }
      });
      await request(app)
        .post("/api/cart/merge-guest")
        .set("X-Guest-Cart-Id", otherSessionId)
        .expect(401);
      expect(await prisma.cartItem.count({ where: { sessionId: otherSessionId } })).toBe(1);

      const empty = await request(app)
        .post("/api/cart/merge-guest")
        .set("X-User-Id", String(user.id))
        .set("X-Guest-Cart-Id", sessionId)
        .expect(200);
      expect(empty.body.merged).toBe(0);
      expect(empty.body.skipped).toBe(0);
      expect(empty.body.items).toEqual([]);
      expect(empty.body.total).toBe(0);
      expect(await prisma.cartItem.count({ where: { sessionId: otherSessionId } })).toBe(1);
    } finally {
      await prisma.cartItem.deleteMany({ where: { sessionId: otherSessionId } });
      if (game) await prisma.game.delete({ where: { id: game.id } });
      await prisma.user.delete({ where: { id: user.id } });
    }
  }, 15000);
});
