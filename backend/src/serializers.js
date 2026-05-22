function toDateString(value) {
  if (!value) return null;
  return new Date(value).toISOString().slice(0, 10);
}

export function serializeGame(game) {
  return {
    id: game.id,
    rawgId: game.rawgId,
    title: game.title,
    description: game.description,
    price: Number(game.price),
    coverUrl: game.coverUrl,
    rating: game.rating,
    genres: game.genres || [],
    platforms: game.platforms || [],
    releaseDate: toDateString(game.releaseDate),
    isActive: game.isActive,
    createdAt: game.createdAt?.toISOString?.() || game.createdAt,
    updatedAt: game.updatedAt?.toISOString?.() || game.updatedAt
  };
}

export function serializeGenre(genre) {
  return {
    id: genre.id,
    name: genre.name,
    createdAt: genre.createdAt?.toISOString?.() || genre.createdAt,
    updatedAt: genre.updatedAt?.toISOString?.() || genre.updatedAt
  };
}

export function serializeCartItem(item) {
  const game = serializeGame(item.game);
  return {
    id: item.id,
    gameId: item.gameId,
    priceAtMoment: Number(item.priceAtMoment),
    title: game.title,
    description: game.description,
    price: Number(item.priceAtMoment),
    coverUrl: game.coverUrl,
    rating: game.rating,
    genres: game.genres,
    platforms: game.platforms,
    releaseDate: game.releaseDate,
    qty: 1
  };
}

export function serializeLibraryItem(item) {
  return {
    id: item.id,
    purchasedAt: item.purchasedAt?.toISOString?.() || item.purchasedAt,
    ...serializeGame(item.game)
  };
}

export function serializeOrder(order) {
  return {
    id: order.id,
    total: Number(order.total),
    status: order.status,
    createdAt: order.createdAt?.toISOString?.() || order.createdAt,
    items: order.items?.map((item) => ({
      id: item.id,
      gameId: item.gameId,
      priceAtPurchase: Number(item.priceAtPurchase),
      game: item.game ? serializeGame(item.game) : undefined
    })) || []
  };
}
