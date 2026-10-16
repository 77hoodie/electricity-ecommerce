import { Prisma } from "@prisma/client";

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

const TAXONOMY_FIELDS = new Map([
  ["genres", {
    catalog: "genre",
    link: "gameGenre",
    foreignKey: "genreId",
    table: Prisma.sql`"GameGenre"`,
    column: Prisma.sql`"genreId"`
  }],
  ["platforms", {
    catalog: "platform",
    link: "gamePlatform",
    foreignKey: "platformId",
    table: Prisma.sql`"GamePlatform"`,
    column: Prisma.sql`"platformId"`
  }]
]);

async function resolveCatalogIds(model, names) {
  const unique = [...new Set(names)];
  if (unique.length === 0) return new Map();

  await model.createMany({
    data: unique.map((name) => ({ name })),
    skipDuplicates: true
  });

  const records = await model.findMany({
    where: { name: { in: unique } },
    select: { id: true, name: true }
  });

  return new Map(records.map(({ name, id }) => [name, id]));
}

async function syncTaxonomyLinks(db, field, entries, catalogNames) {
  const { catalog, link, foreignKey, table, column } = TAXONOMY_FIELDS.get(field);
  const idsByName = await resolveCatalogIds(db[catalog], catalogNames);

  const desired = entries.map((entry) => ({
    id: entry.id,
    ids: entry[field].map((name) => idsByName.get(name))
  }));

  await db.$executeRaw`
    DELETE FROM ${table} AS link
    USING jsonb_to_recordset(${JSON.stringify(desired)}::jsonb)
      AS scope("id" integer, "ids" integer[])
    WHERE link."gameId" = scope."id"
      AND NOT (link.${column} = ANY(scope."ids"))
  `;

  const data = desired.flatMap((entry) =>
    entry.ids.map((id) => ({ gameId: entry.id, [foreignKey]: id }))
  );

  if (data.length > 0) {
    await db[link].createMany({ data, skipDuplicates: true });
  }
}

export async function seedGames(games, db) {
  if (games.length === 0) return;

  const prepared = games.map((game) => ({
    game,
    genres: parseStringList(game.genres || []),
    platforms: parseStringList(game.platforms || [])
  }));

  const latestByTitle = new Map();
  for (const entry of prepared) latestByTitle.set(entry.game.title, entry);
  const entries = [...latestByTitle.values()];

  const existingRows = await db.game.findMany({
    where: { title: { in: entries.map((entry) => entry.game.title) } },
    select: { id: true, title: true },
    orderBy: { id: "asc" }
  });

  const idByTitle = new Map();
  for (const row of existingRows) {
    if (!idByTitle.has(row.title)) idByTitle.set(row.title, row.id);
  }

  const toCreate = entries.filter((entry) => !idByTitle.has(entry.game.title));
  const toUpdate = entries.filter((entry) => idByTitle.has(entry.game.title));
  const savedIds = new Map(idByTitle);

  if (toCreate.length > 0) {
    const created = await db.game.createManyAndReturn({
      data: toCreate.map(({ game, genres, platforms }) => ({ ...game, genres, platforms })),
      select: { id: true, title: true }
    });
    for (const row of created) savedIds.set(row.title, row.id);
  }

  if (toUpdate.length > 0) {
    const incoming = toUpdate.map(({ game, genres, platforms }) => ({
      id: idByTitle.get(game.title),
      description: game.description,
      price: game.price,
      coverUrl: game.coverUrl,
      rating: game.rating,
      genres,
      platforms,
      releaseDate: game.releaseDate
    }));

    await db.$executeRaw`
      UPDATE "Game" AS target
      SET "description" = incoming."description",
          "price" = incoming."price",
          "coverUrl" = incoming."coverUrl",
          "rating" = incoming."rating",
          "genres" = incoming."genres",
          "platforms" = incoming."platforms",
          "releaseDate" = incoming."releaseDate",
          "isActive" = true,
          "updatedAt" = (now() AT TIME ZONE 'UTC')
      FROM jsonb_to_recordset(${JSON.stringify(incoming)}::jsonb)
        AS incoming(
          "id" integer,
          "description" text,
          "price" numeric,
          "coverUrl" text,
          "rating" double precision,
          "genres" text[],
          "platforms" text[],
          "releaseDate" timestamp
        )
      WHERE target."id" = incoming."id"
    `;
  }

  const linkEntries = entries.map(({ game, genres, platforms }) => ({
    id: savedIds.get(game.title),
    genres,
    platforms
  }));

  await syncTaxonomyLinks(db, "genres", linkEntries, prepared.flatMap((entry) => entry.genres));
  await syncTaxonomyLinks(db, "platforms", linkEntries, prepared.flatMap((entry) => entry.platforms));
}
