import { describe, expect, it } from "vitest";
import { assertCanAddToCart, calculateCartTotal } from "../../src/cartRules.js";

describe("regras do carrinho", () => {
  it("permite adicionar um jogo ativo que não está no carrinho nem na biblioteca", () => {
    expect(() => assertCanAddToCart({
      game: { id: 1, isActive: true },
      existingCartItem: null,
      existingLibraryItem: null
    })).not.toThrow();
  });

  it("bloqueia jogo duplicado no carrinho", () => {
    expect(() => assertCanAddToCart({
      game: { id: 99, isActive: true },
      existingCartItem: { id: 1, gameId: 99 },
      existingLibraryItem: null
    })).toThrow("Este jogo já está no carrinho");
  });

  it("bloqueia jogo já comprado", () => {
    expect(() => assertCanAddToCart({
      game: { id: 1, isActive: true },
      existingCartItem: null,
      existingLibraryItem: { id: 5, gameId: 1 }
    })).toThrow("Este jogo já está na biblioteca");
  });

  it("bloqueia jogo inexistente ou inativo", () => {
    expect(() => assertCanAddToCart({
      game: null,
      existingCartItem: null,
      existingLibraryItem: null
    })).toThrow("Jogo não encontrado ou indisponível");

    expect(() => assertCanAddToCart({
      game: { id: 1, isActive: false },
      existingCartItem: null,
      existingLibraryItem: null
    })).toThrow("Jogo não encontrado ou indisponível");
  });

  it("calcula o total do carrinho usando o preço salvo no momento da adição", () => {
    const total = calculateCartTotal([
      { priceAtMoment: 39.9 },
      { priceAtMoment: "60.10" }
    ]);

    expect(total).toBe(100);
  });
});
