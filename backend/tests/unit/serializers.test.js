import { describe, expect, it } from "vitest";
import {
  serializeCartItem,
  serializeGame,
  serializeGenre,
  serializeLibraryItem,
  serializeOrder,
  serializePlatform,
  serializePromotion,
  serializeUser,
  serializeWishlistItem
} from "../../src/serializers.js";

const createdAt = new Date("2026-01-01T10:00:00.000Z");
const updatedAt = new Date("2026-01-02T10:00:00.000Z");
const game = {
  id: 1,
  rawgId: 99,
  title: "Teste",
  description: "Descrição",
  price: "39.90",
  coverUrl: "https://example.com/game.jpg",
  rating: 4.2,
  genres: ["Ação"],
  platforms: ["PC"],
  releaseDate: new Date("2026-01-03"),
  isActive: true,
  createdAt,
  updatedAt
};

describe("serializadores", () => {
  it("serializa usuário sem expor senha", () => {
    const user = serializeUser({ id: 1, name: "Ana", email: "ana@test.com", role: "USER", passwordHash: "hash", createdAt, updatedAt });

    expect(user).toEqual({
      id: 1,
      name: "Ana",
      email: "ana@test.com",
      role: "USER",
      createdAt: createdAt.toISOString(),
      updatedAt: updatedAt.toISOString()
    });
    expect(user.passwordHash).toBeUndefined();
  });

  it("serializa jogo convertendo preço decimal para number", () => {
    const serialized = serializeGame(game);

    expect(serialized.price).toBe(39.9);
    expect(serialized.releaseDate).toBe("2026-01-03");
  });

  it("prioriza gêneros e plataformas vinculados quando eles vêm do banco relacional", () => {
    const serialized = serializeGame({
      ...game,
      genres: ["Fallback"],
      platforms: ["Fallback"],
      genreLinks: [{ genre: { name: "Hip Hop" } }, { genre: { name: "Ação" } }],
      platformLinks: [{ platform: { name: "PC" } }]
    });

    expect(serialized.genres).toEqual(["Hip Hop", "Ação"]);
    expect(serialized.platforms).toEqual(["PC"]);
  });

  it("serializa entidades administrativas", () => {
    expect(serializeGenre({ id: 1, name: "RPG", createdAt, updatedAt }).name).toBe("RPG");
    expect(serializePlatform({ id: 2, name: "PC", createdAt, updatedAt }).name).toBe("PC");
  });

  it("serializa carrinho, biblioteca e desejos", () => {
    const cartItem = serializeCartItem({ id: 1, userId: 1, sessionId: null, gameId: 1, priceAtMoment: "39.90", game });
    const libraryItem = serializeLibraryItem({ id: 2, userId: 1, purchasedAt: createdAt, game });
    const wishlistItem = serializeWishlistItem({ id: 3, userId: 1, createdAt, game });

    expect(cartItem.price).toBe(39.9);
    expect(libraryItem.title).toBe("Teste");
    expect(wishlistItem.title).toBe("Teste");
  });

  it("serializa pedidos e promoções", () => {
    const order = serializeOrder({
      id: 10,
      userId: 1,
      user: { id: 1, name: "Ana", email: "ana@test.com", role: "USER", createdAt, updatedAt },
      total: "39.90",
      status: "PAID",
      createdAt,
      items: [{ id: 1, gameId: 1, priceAtPurchase: "39.90", game }]
    });
    const promotion = serializePromotion({
      id: 1,
      gameId: 1,
      game,
      discountPercentage: 20,
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-12-31"),
      isActive: true,
      createdAt,
      updatedAt
    });

    expect(order.total).toBe(39.9);
    expect(order.items[0].game.title).toBe("Teste");
    expect(promotion.discountPercentage).toBe(20);
    expect(promotion.startDate).toBe("2026-01-01");
  });
});
