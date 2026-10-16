import { parseStringList } from "../prisma/seedGames.js";

async function syncNames(db, field, gameId, names) {
  const items = parseStringList(names);
  const isGenre = field === "genres";
  const model = isGenre ? db.genre : db.platform;
  const link = isGenre ? db.gameGenre : db.gamePlatform;
  const foreignKey = isGenre ? "genreId" : "platformId";
  const records = [];

  for (const name of items) {
    records.push(await model.upsert({
      where: { name },
      update: {},
      create: { name }
    }));
  }

  const ids = records.map((record) => record.id);
  if (ids.length === 0) {
    await link.deleteMany({ where: { gameId } });
  } else {
    await link.deleteMany({ where: { gameId, [foreignKey]: { notIn: ids } } });
    await link.createMany({
      data: ids.map((id) => ({ gameId, [foreignKey]: id })),
      skipDuplicates: true
    });
  }

  await db.game.update({ where: { id: gameId }, data: { [field]: items } });
}

export async function seedGamesOriginal(games, db) {
  for (const game of games) {
    const existing = await db.game.findFirst({ where: { title: game.title } });
    const saved = existing
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

    await syncNames(db, "genres", saved.id, game.genres || []);
    await syncNames(db, "platforms", saved.id, game.platforms || []);
  }
}
