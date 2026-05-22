const FALLBACK_COVER = "https://placehold.co/600x400?text=Electricity";

export function mapRawgGame(rawgGame, price = 99.9) {
  return {
    rawgId: rawgGame.id,
    title: rawgGame.name,
    description: rawgGame.description_raw || rawgGame.description || "Descrição não disponível.",
    price: Number(price),
    coverUrl: rawgGame.background_image || FALLBACK_COVER,
    rating: rawgGame.rating || 0,
    genres: Array.isArray(rawgGame.genres) ? rawgGame.genres.map((genre) => genre.name) : [],
    platforms: Array.isArray(rawgGame.platforms)
      ? rawgGame.platforms.map((item) => item.platform?.name).filter(Boolean)
      : [],
    releaseDate: rawgGame.released ? new Date(rawgGame.released) : null,
    isActive: true
  };
}
