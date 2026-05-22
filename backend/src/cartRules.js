import { HttpError } from "./errors.js";

export function assertCanAddToCart({ game, existingCartItem, existingLibraryItem }) {
  if (!game || !game.isActive) {
    throw new HttpError(404, "Jogo não encontrado ou indisponível");
  }

  if (existingLibraryItem) {
    throw new HttpError(409, "Este jogo já está na biblioteca");
  }

  if (existingCartItem) {
    throw new HttpError(409, "Este jogo já está no carrinho");
  }
}

export function calculateCartTotal(cartItems) {
  return cartItems.reduce((total, item) => total + Number(item.priceAtMoment), 0);
}
