function toDateString(value) {
  if (!value) return null;
  return new Date(value).toISOString().slice(0, 10);
}

function listFromRelationsOrArray(record, relationKey, nestedKey, fallbackKey) {
  if (Array.isArray(record?.[relationKey])) {
    return record[relationKey]
      .map((item) => item?.[nestedKey]?.name)
      .filter(Boolean);
  }
  return record?.[fallbackKey] || [];
}

export function serializeUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt?.toISOString?.() || user.createdAt,
    updatedAt: user.updatedAt?.toISOString?.() || user.updatedAt
  };
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
    genres: listFromRelationsOrArray(game, "genreLinks", "genre", "genres"),
    platforms: listFromRelationsOrArray(game, "platformLinks", "platform", "platforms"),
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

export function serializePlatform(platform) {
  return {
    id: platform.id,
    name: platform.name,
    createdAt: platform.createdAt?.toISOString?.() || platform.createdAt,
    updatedAt: platform.updatedAt?.toISOString?.() || platform.updatedAt
  };
}

export function serializeCartItem(item) {
  const game = serializeGame(item.game);
  return {
    id: item.id,
    userId: item.userId,
    sessionId: item.sessionId,
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
    userId: item.userId,
    purchasedAt: item.purchasedAt?.toISOString?.() || item.purchasedAt,
    ...serializeGame(item.game)
  };
}

export function serializeWishlistItem(item) {
  return {
    id: item.id,
    userId: item.userId,
    createdAt: item.createdAt?.toISOString?.() || item.createdAt,
    ...serializeGame(item.game)
  };
}

export function serializeOrder(order) {
  return {
    id: order.id,
    userId: order.userId,
    user: order.user ? serializeUser(order.user) : undefined,
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

export function serializePromotion(promotion) {
  return {
    id: promotion.id,
    gameId: promotion.gameId,
    game: promotion.game ? serializeGame(promotion.game) : undefined,
    discountPercentage: promotion.discountPercentage,
    startDate: toDateString(promotion.startDate),
    endDate: toDateString(promotion.endDate),
    isActive: promotion.isActive,
    createdAt: promotion.createdAt?.toISOString?.() || promotion.createdAt,
    updatedAt: promotion.updatedAt?.toISOString?.() || promotion.updatedAt
  };
}
