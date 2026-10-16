export function parseStringList(value) {
  const rawItems = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];

  const unique = new Map();
  for (const item of rawItems) {
    const name = String(item).trim();
    if (name) unique.set(name.toLowerCase(), name);
  }
  return [...unique.values()];
}

async function syncGameGenres(gameId, names, db) {
  const genres = parseStringList(names);
  const records = [];
  for (const name of genres) {
    records.push(await db.genre.upsert({ where: { name }, update: {}, create: { name } }));
  }

  const ids = records.map((genre) => genre.id);
  if (ids.length === 0) {
    await db.gameGenre.deleteMany({ where: { gameId } });
  } else {
    await db.gameGenre.deleteMany({ where: { gameId, genreId: { notIn: ids } } });
    await db.gameGenre.createMany({
      data: ids.map((genreId) => ({ gameId, genreId })),
      skipDuplicates: true
    });
  }
  await db.game.update({ where: { id: gameId }, data: { genres } });
}

async function syncGamePlatforms(gameId, names, db) {
  const platforms = parseStringList(names);
  const records = [];
  for (const name of platforms) {
    records.push(await db.platform.upsert({ where: { name }, update: {}, create: { name } }));
  }

  const ids = records.map((platform) => platform.id);
  if (ids.length === 0) {
    await db.gamePlatform.deleteMany({ where: { gameId } });
  } else {
    await db.gamePlatform.deleteMany({ where: { gameId, platformId: { notIn: ids } } });
    await db.gamePlatform.createMany({
      data: ids.map((platformId) => ({ gameId, platformId })),
      skipDuplicates: true
    });
  }
  await db.game.update({ where: { id: gameId }, data: { platforms } });
}

async function syncGameTaxonomy(gameId, game, db) {
  await syncGameGenres(gameId, game.genres || [], db);
  await syncGamePlatforms(gameId, game.platforms || [], db);
}

export async function seedGames(games, db) {
  for (const game of games) {
    const existing = await db.game.findFirst({ where: { title: game.title } });
    const savedGame = existing
      ? await db.game.update({
          where: { id: existing.id },
          data: {
            description: game.description,
            price: game.price,
            coverUrl: game.coverUrl,
            rating: game.rating,
            genres: game.genres,
            platforms: game.platforms,
            releaseDate: game.releaseDate,
            isActive: true
          }
        })
      : await db.game.create({ data: game });

    await syncGameTaxonomy(savedGame.id, game, db);
  }
}
