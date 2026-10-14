import { HttpError } from "./errors.js";

export function validatePromotionInput({ gameId, discountPercentage, startDate, endDate }) {
  const parsedGameId = Number(gameId);
  const parsedDiscount = Number(discountPercentage);
  const parsedStart = startDate ? new Date(startDate) : null;
  const parsedEnd = endDate ? new Date(endDate) : null;

  if (!Number.isInteger(parsedGameId) || parsedGameId <= 0) {
    throw new HttpError(400, "Jogo da promoção é obrigatório");
  }

  if (!Number.isInteger(parsedDiscount) || parsedDiscount < 1 || parsedDiscount > 90) {
    throw new HttpError(400, "O desconto deve estar entre 1% e 90%");
  }

  if (!parsedStart || Number.isNaN(parsedStart.getTime())) {
    throw new HttpError(400, "Data inicial inválida");
  }

  if (!parsedEnd || Number.isNaN(parsedEnd.getTime())) {
    throw new HttpError(400, "Data final inválida");
  }

  if (parsedStart >= parsedEnd) {
    throw new HttpError(400, "A data inicial deve ser anterior à data final");
  }

  return {
    gameId: parsedGameId,
    discountPercentage: parsedDiscount,
    startDate: parsedStart,
    endDate: parsedEnd
  };
}

export function calculateDiscountedPrice(price, discountPercentage) {
  const basePrice = Number(price);
  const discount = Number(discountPercentage);
  return Number((basePrice * (1 - discount / 100)).toFixed(2));
}
