import { describe, expect, it } from "vitest";
import { calculateDiscountedPrice, validatePromotionInput } from "../../src/promotionRules.js";

describe("regras de promoção", () => {
  it("valida uma promoção com desconto e datas corretas", () => {
    const result = validatePromotionInput({
      gameId: 1,
      discountPercentage: 25,
      startDate: "2026-01-01",
      endDate: "2026-02-01"
    });

    expect(result.gameId).toBe(1);
    expect(result.discountPercentage).toBe(25);
  });

  it("bloqueia desconto fora do intervalo permitido", () => {
    expect(() => validatePromotionInput({
      gameId: 1,
      discountPercentage: 0,
      startDate: "2026-01-01",
      endDate: "2026-02-01"
    })).toThrow("O desconto deve estar entre 1% e 90%");
  });

  it("bloqueia período de promoção inválido", () => {
    expect(() => validatePromotionInput({
      gameId: 1,
      discountPercentage: 10,
      startDate: "2026-02-01",
      endDate: "2026-01-01"
    })).toThrow("A data inicial deve ser anterior à data final");
  });

  it("calcula preço com desconto", () => {
    expect(calculateDiscountedPrice(100, 20)).toBe(80);
    expect(calculateDiscountedPrice("99.90", 10)).toBe(89.91);
  });
});
