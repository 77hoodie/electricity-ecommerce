import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";

const maybeDescribe = process.env.RUN_INTEGRATION === "true" ? describe : describe.skip;

async function loadContext() {
  const { seedGames } = await import("../../prisma/seedGames.js");
  const { prisma } = await import("../../src/prisma.js");
  return { seedGames, prisma };
}

function buildGame(prefix, label, overrides = {}) {
  return {
    title: `${prefix}-${label}`,
    description: "Descrição de teste do seedGames",
    price: 19.9,
    coverUrl: `https://example.com/${label}.jpg`,
    rating: 4.2,
    genres: [],
    platforms: [],
    releaseDate: new Date("2020-05-17"),
    ...overrides
  };
}

async function cleanup(prisma, prefix) {
  await prisma.game.deleteMany({ where: { title: { startsWith: prefix } } });
  await prisma.genre.deleteMany({ where: { name: { startsWith: prefix } } });
  await prisma.platform.deleteMany({ where: { name: { startsWith: prefix } } });
}

function linkNames(links, key) {
  return links.map((link) => link[key].name).sort();
}

async function loadState(prisma, prefix) {
  const games = await prisma.game.findMany({
    where: { title: { startsWith: prefix } },
    include: {
      genreLinks: { include: { genre: true } },
      platformLinks: { include: { platform: true } }
    },
    orderBy: { title: "asc" }
  });

  return games.map((game) => ({
    title: game.title,
    description: game.description,
    price: Number(game.price),
    coverUrl: game.coverUrl,
    rating: game.rating,
    releaseDate: game.releaseDate ? game.releaseDate.toISOString() : null,
    isActive: game.isActive,
    genres: game.genres,
    platforms: game.platforms,
    genreLinks: linkNames(game.genreLinks, "genre"),
    platformLinks: linkNames(game.platformLinks, "platform")
  }));
}

async function loadIds(prisma, prefix) {
  const games = await prisma.game.findMany({
    where: { title: { startsWith: prefix } },
    orderBy: { title: "asc" }
  });
  return games.map((game) => game.id);
}

async function catalogNames(prisma, model, prefix) {
  const rows = await prisma[model].findMany({
    where: { name: { startsWith: prefix } },
    orderBy: { name: "asc" }
  });
  return rows.map((row) => row.name);
}

maybeDescribe("seedGames com PostgreSQL", () => {
  it("cria jogos, catálogos, vínculos e arrays normalizados", async () => {
    const { seedGames, prisma } = await loadContext();
    const prefix = `Teste-${randomUUID()}`;
    const action = `${prefix}-Ação`;
    const puzzle = `${prefix}-Puzzle`;
    const pc = `${prefix}-PC`;
    const handheld = `${prefix}-Portátil`;

    try {
      await seedGames(
        [
          buildGame(prefix, "A", { genres: [action, puzzle], platforms: [pc] }),
          buildGame(prefix, "B", { genres: [puzzle], platforms: [pc, handheld] })
        ],
        prisma
      );

      const state = await loadState(prisma, prefix);

      expect(state).toHaveLength(2);
      expect(state[0]).toEqual({
        title: `${prefix}-A`,
        description: "Descrição de teste do seedGames",
        price: 19.9,
        coverUrl: "https://example.com/A.jpg",
        rating: 4.2,
        releaseDate: "2020-05-17T00:00:00.000Z",
        isActive: true,
        genres: [action, puzzle],
        platforms: [pc],
        genreLinks: [action, puzzle].sort(),
        platformLinks: [pc]
      });
      expect(state[1].genres).toEqual([puzzle]);
      expect(state[1].platforms).toEqual([pc, handheld]);
      expect(state[1].genreLinks).toEqual([puzzle]);
      expect(state[1].platformLinks).toEqual([handheld, pc].sort());

      expect(await catalogNames(prisma, "genre", prefix)).toEqual([action, puzzle].sort());
      expect(await catalogNames(prisma, "platform", prefix)).toEqual([pc, handheld].sort());
    } finally {
      await cleanup(prisma, prefix);
    }
  });

  it("atualiza o jogo existente pelo título sem criar duplicata", async () => {
    const { seedGames, prisma } = await loadContext();
    const prefix = `Teste-${randomUUID()}`;
    const genre = `${prefix}-Novo`;

    try {
      const existing = await prisma.game.create({
        data: {
          title: `${prefix}-A`,
          description: "Descrição antiga",
          price: 1,
          rating: 1,
          genres: [`${prefix}-Velho`],
          isActive: false
        }
      });

      await seedGames([buildGame(prefix, "A", { genres: [genre] })], prisma);

      const rows = await prisma.game.findMany({ where: { title: { startsWith: prefix } } });
      expect(rows).toHaveLength(1);
      expect(rows[0].id).toBe(existing.id);

      const state = await loadState(prisma, prefix);
      expect(state[0].description).toBe("Descrição de teste do seedGames");
      expect(state[0].price).toBe(19.9);
      expect(state[0].rating).toBe(4.2);
      expect(state[0].isActive).toBe(true);
      expect(state[0].genres).toEqual([genre]);
      expect(state[0].genreLinks).toEqual([genre]);
    } finally {
      await cleanup(prisma, prefix);
    }
  });

  it("remove vínculos obsoletos e preserva os que continuam válidos", async () => {
    const { seedGames, prisma } = await loadContext();
    const prefix = `Teste-${randomUUID()}`;
    const kept = `${prefix}-Mantido`;
    const stale = `${prefix}-Obsoleto`;
    const added = `${prefix}-Adicionado`;

    try {
      const game = await prisma.game.create({
        data: { title: `${prefix}-A`, description: "Teste", price: 1, genres: [kept, stale] }
      });
      const keptGenre = await prisma.genre.create({ data: { name: kept } });
      const staleGenre = await prisma.genre.create({ data: { name: stale } });
      await prisma.gameGenre.createMany({
        data: [
          { gameId: game.id, genreId: keptGenre.id },
          { gameId: game.id, genreId: staleGenre.id }
        ]
      });

      await seedGames([buildGame(prefix, "A", { genres: [kept, added] })], prisma);

      const links = await prisma.gameGenre.findMany({ where: { gameId: game.id } });
      const names = await prisma.genre.findMany({
        where: { id: { in: links.map((link) => link.genreId) } }
      });

      expect(names.map((genre) => genre.name).sort()).toEqual([added, kept].sort());
      expect(links.map((link) => link.genreId)).toContain(keptGenre.id);

      const keptRows = await prisma.genre.findMany({ where: { name: kept } });
      expect(keptRows).toHaveLength(1);
      expect(keptRows[0].id).toBe(keptGenre.id);
    } finally {
      await cleanup(prisma, prefix);
    }
  });

  it("listas vazias removem todos os vínculos e zeram os arrays", async () => {
    const { seedGames, prisma } = await loadContext();
    const prefix = `Teste-${randomUUID()}`;
    const genre = `${prefix}-Genero`;
    const platform = `${prefix}-Plataforma`;

    try {
      const game = await prisma.game.create({
        data: {
          title: `${prefix}-A`,
          description: "Teste",
          price: 1,
          genres: [genre],
          platforms: [platform]
        }
      });
      const genreRow = await prisma.genre.create({ data: { name: genre } });
      const platformRow = await prisma.platform.create({ data: { name: platform } });
      await prisma.gameGenre.create({ data: { gameId: game.id, genreId: genreRow.id } });
      await prisma.gamePlatform.create({ data: { gameId: game.id, platformId: platformRow.id } });

      await seedGames([buildGame(prefix, "A", { genres: [], platforms: [] })], prisma);

      const state = await loadState(prisma, prefix);
      expect(state[0].genres).toEqual([]);
      expect(state[0].platforms).toEqual([]);
      expect(state[0].genreLinks).toEqual([]);
      expect(state[0].platformLinks).toEqual([]);
    } finally {
      await cleanup(prisma, prefix);
    }
  });

  it("jogo sem os campos genres e platforms equivale a listas vazias", async () => {
    const { seedGames, prisma } = await loadContext();
    const prefix = `Teste-${randomUUID()}`;
    const genre = `${prefix}-Genero`;

    try {
      const game = await prisma.game.create({
        data: { title: `${prefix}-A`, description: "Teste", price: 1, genres: [genre] }
      });
      const genreRow = await prisma.genre.create({ data: { name: genre } });
      await prisma.gameGenre.create({ data: { gameId: game.id, genreId: genreRow.id } });

      const input = buildGame(prefix, "A");
      delete input.genres;
      delete input.platforms;
      await seedGames([input], prisma);

      const state = await loadState(prisma, prefix);
      expect(state[0].genres).toEqual([]);
      expect(state[0].platforms).toEqual([]);
      expect(state[0].genreLinks).toEqual([]);
      expect(state[0].platformLinks).toEqual([]);
    } finally {
      await cleanup(prisma, prefix);
    }
  });

  it("normaliza espaços, itens vazios e duplicatas sem diferenciar maiúsculas", async () => {
    const { seedGames, prisma } = await loadContext();
    const prefix = `Teste-${randomUUID()}`;
    const indie = `${prefix}-indie`;
    const rpg = `${prefix}-RPG`;

    try {
      await seedGames(
        [buildGame(prefix, "A", { genres: [`${prefix}-Indie`, ` ${indie} `, "", rpg] })],
        prisma
      );

      const state = await loadState(prisma, prefix);
      expect(state[0].genres).toEqual([indie, rpg]);
      expect(state[0].genreLinks).toEqual([indie, rpg].sort());
      expect(await catalogNames(prisma, "genre", prefix)).toEqual([indie, rpg].sort());
    } finally {
      await cleanup(prisma, prefix);
    }
  });

  it("mantém separados os nomes que diferem somente na capitalização entre jogos", async () => {
    const { seedGames, prisma } = await loadContext();
    const prefix = `Teste-${randomUUID()}`;
    const upper = `${prefix}-RPG`;
    const lower = `${prefix}-rpg`;

    try {
      await seedGames(
        [
          buildGame(prefix, "A", { genres: [upper], platforms: [`${prefix}-PC`] }),
          buildGame(prefix, "B", { genres: [lower], platforms: [`${prefix}-pc`] })
        ],
        prisma
      );

      const state = await loadState(prisma, prefix);
      expect(state[0].genreLinks).toEqual([upper]);
      expect(state[1].genreLinks).toEqual([lower]);
      expect(state[0].platformLinks).toEqual([`${prefix}-PC`]);
      expect(state[1].platformLinks).toEqual([`${prefix}-pc`]);
      expect(await catalogNames(prisma, "genre", prefix)).toEqual([upper, lower].sort());
      expect(await catalogNames(prisma, "platform", prefix)).toEqual(
        [`${prefix}-PC`, `${prefix}-pc`].sort()
      );
    } finally {
      await cleanup(prisma, prefix);
    }
  });

  it("título repetido na entrada: o último vence e o catálogo mantém os nomes do primeiro", async () => {
    const { seedGames, prisma } = await loadContext();
    const prefix = `Teste-${randomUUID()}`;
    const first = `${prefix}-Primeiro`;
    const second = `${prefix}-Segundo`;

    try {
      await seedGames(
        [
          buildGame(prefix, "A", {
            description: "primeira versão",
            price: 10,
            genres: [first],
            platforms: [`${prefix}-P1`]
          }),
          buildGame(prefix, "A", {
            description: "segunda versão",
            price: 20,
            genres: [second],
            platforms: [`${prefix}-P2`]
          })
        ],
        prisma
      );

      const state = await loadState(prisma, prefix);
      expect(state).toHaveLength(1);
      expect(state[0].description).toBe("segunda versão");
      expect(state[0].price).toBe(20);
      expect(state[0].genres).toEqual([second]);
      expect(state[0].genreLinks).toEqual([second]);
      expect(state[0].platforms).toEqual([`${prefix}-P2`]);
      expect(state[0].platformLinks).toEqual([`${prefix}-P2`]);
      expect(await catalogNames(prisma, "genre", prefix)).toEqual([first, second].sort());
      expect(await catalogNames(prisma, "platform", prefix)).toEqual(
        [`${prefix}-P1`, `${prefix}-P2`].sort()
      );
    } finally {
      await cleanup(prisma, prefix);
    }
  });

  it("preserva os campos da primeira ocorrência com títulos repetidos em lotes diferentes", async () => {
    const { seedGames, prisma } = await loadContext();
    const { randomInt } = await import("node:crypto");
    const prefix = `Teste-${randomUUID()}`;
    const firstRawgId = randomInt(1_000_000_000, 1_500_000_000);
    const secondRawgId = randomInt(1_500_000_000, 2_000_000_000);
    const firstGenre = `${prefix}-Primeiro`;
    const lastGenre = `${prefix}-Ultimo`;
    const input = Array.from({ length: 35 }, (_, index) =>
      buildGame(prefix, `Jogo-${index}`, { genres: [`${prefix}-G-${index}`] })
    );

    input[0] = buildGame(prefix, "Repetido", {
      rawgId: firstRawgId,
      isActive: false,
      description: "primeira versão",
      genres: [firstGenre]
    });
    input[34] = buildGame(prefix, "Repetido", {
      rawgId: secondRawgId,
      isActive: false,
      description: "última versão",
      genres: [lastGenre]
    });

    try {
      await seedGames(input, prisma);

      const rows = await prisma.game.findMany({
        where: { title: `${prefix}-Repetido` },
        include: { genreLinks: { include: { genre: true } } }
      });
      expect(rows).toHaveLength(1);
      expect(rows[0].rawgId).toBe(firstRawgId);
      expect(rows[0].isActive).toBe(true);
      expect(rows[0].description).toBe("última versão");
      expect(rows[0].genres).toEqual([lastGenre]);
      expect(linkNames(rows[0].genreLinks, "genre")).toEqual([lastGenre]);
      expect(await catalogNames(prisma, "genre", prefix)).toContain(firstGenre);
    } finally {
      await cleanup(prisma, prefix);
    }
  });

  it("é idempotente ao ser executada duas vezes", async () => {
    const { seedGames, prisma } = await loadContext();
    const prefix = `Teste-${randomUUID()}`;
    const games = [
      buildGame(prefix, "A", {
        genres: [`${prefix}-G1`, `${prefix}-G2`],
        platforms: [`${prefix}-P1`]
      }),
      buildGame(prefix, "B", {
        genres: [`${prefix}-G2`],
        platforms: [`${prefix}-P1`, `${prefix}-P2`]
      })
    ];

    try {
      await seedGames(games, prisma);
      const firstState = await loadState(prisma, prefix);
      const firstIds = await loadIds(prisma, prefix);
      const firstGenres = await catalogNames(prisma, "genre", prefix);

      await seedGames(games, prisma);
      const secondState = await loadState(prisma, prefix);
      const secondIds = await loadIds(prisma, prefix);

      expect(secondState).toEqual(firstState);
      expect(secondIds).toEqual(firstIds);
      expect(await catalogNames(prisma, "genre", prefix)).toEqual(firstGenres);

      const scope = { game: { title: { startsWith: prefix } } };
      expect(await prisma.gameGenre.count({ where: scope })).toBe(3);
      expect(await prisma.gamePlatform.count({ where: scope })).toBe(3);
    } finally {
      await cleanup(prisma, prefix);
    }
  });

  it("não altera jogos que não estão na entrada", async () => {
    const { seedGames, prisma } = await loadContext();
    const prefix = `Teste-${randomUUID()}`;
    const otherGenre = `${prefix}-Outro`;

    try {
      const other = await prisma.game.create({
        data: { title: `${prefix}-Outro`, description: "Intocado", price: 5, genres: [otherGenre] }
      });
      const otherRow = await prisma.genre.create({ data: { name: otherGenre } });
      await prisma.gameGenre.create({ data: { gameId: other.id, genreId: otherRow.id } });

      await seedGames([buildGame(prefix, "A", { genres: [`${prefix}-G1`] })], prisma);

      const untouched = await prisma.game.findUnique({
        where: { id: other.id },
        include: { genreLinks: true }
      });
      expect(untouched.description).toBe("Intocado");
      expect(untouched.genres).toEqual([otherGenre]);
      expect(untouched.genreLinks).toHaveLength(1);
      expect(untouched.genreLinks[0].genreId).toBe(otherRow.id);
    } finally {
      await cleanup(prisma, prefix);
    }
  });
});
