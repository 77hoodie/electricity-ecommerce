import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import request from "supertest";

const maybeDescribe = process.env.RUN_INTEGRATION === "true" ? describe : describe.skip;

async function createLegacyGame(prisma, prefix, label, genres, platforms) {
  return prisma.game.create({
    data: {
      title: `Jogo ${prefix}-${label}`,
      description: "Teste de sincronização legada da taxonomia",
      price: 1,
      genres,
      platforms,
      isActive: false
    }
  });
}

async function cleanup(prisma, games, prefix) {
  const ids = games.filter(Boolean).map((game) => game.id);
  if (ids.length > 0) {
    await prisma.game.deleteMany({ where: { id: { in: ids } } });
  }
  await prisma.genre.deleteMany({ where: { name: { startsWith: prefix } } });
  await prisma.platform.deleteMany({ where: { name: { startsWith: prefix } } });
}

maybeDescribe("syncAllGamesTaxonomy com PostgreSQL", () => {
  it("cria catálogos e vínculos para todos os jogos sem alterar a saída esperada", async () => {
    const { syncAllGamesTaxonomy } = await import("../../src/app.js");
    const { prisma } = await import("../../src/prisma.js");
    const prefix = `Teste-${randomUUID()}`;
    const action = `${prefix}-Ação`;
    const puzzle = `${prefix}-Puzzle`;
    const pc = `${prefix}-PC`;
    const handheld = `${prefix}-Portátil`;
    const games = [];

    try {
      games.push(await createLegacyGame(prisma, prefix, "A", [action, puzzle], [pc]));
      games.push(await createLegacyGame(prisma, prefix, "B", [puzzle], [pc, handheld]));
      games.push(await createLegacyGame(prisma, prefix, "C", [], []));

      await syncAllGamesTaxonomy();

      const synced = await prisma.game.findMany({
        where: { id: { in: games.map((game) => game.id) } },
        include: {
          genreLinks: { include: { genre: true } },
          platformLinks: { include: { platform: true } }
        },
        orderBy: { id: "asc" }
      });

      const genreNames = (game) => game.genreLinks.map((link) => link.genre.name).sort();
      const platformNames = (game) => game.platformLinks.map((link) => link.platform.name).sort();

      expect(genreNames(synced[0])).toEqual([action, puzzle].sort());
      expect(platformNames(synced[0])).toEqual([pc]);
      expect(genreNames(synced[1])).toEqual([puzzle]);
      expect(platformNames(synced[1])).toEqual([handheld, pc].sort());
      expect(genreNames(synced[2])).toEqual([]);
      expect(platformNames(synced[2])).toEqual([]);

      expect(synced[0].genres).toEqual([action, puzzle]);
      expect(synced[1].platforms).toEqual([pc, handheld]);

      const puzzleRows = await prisma.genre.findMany({ where: { name: puzzle } });
      expect(puzzleRows).toHaveLength(1);
    } finally {
      await cleanup(prisma, games, prefix);
    }
  });

  it("remove vínculos obsoletos e preserva os que continuam válidos", async () => {
    const { syncAllGamesTaxonomy } = await import("../../src/app.js");
    const { prisma } = await import("../../src/prisma.js");
    const prefix = `Teste-${randomUUID()}`;
    const kept = `${prefix}-Mantido`;
    const stale = `${prefix}-Obsoleto`;
    const games = [];

    try {
      games.push(await createLegacyGame(prisma, prefix, "D", [kept], []));

      const keptGenre = await prisma.genre.create({ data: { name: kept } });
      const staleGenre = await prisma.genre.create({ data: { name: stale } });
      await prisma.gameGenre.createMany({
        data: [
          { gameId: games[0].id, genreId: keptGenre.id },
          { gameId: games[0].id, genreId: staleGenre.id }
        ]
      });

      await syncAllGamesTaxonomy();

      const links = await prisma.gameGenre.findMany({ where: { gameId: games[0].id } });
      expect(links).toHaveLength(1);
      expect(links[0].genreId).toBe(keptGenre.id);
    } finally {
      await cleanup(prisma, games, prefix);
    }
  });

  it("preserva relacionamentos que diferem somente na capitalização", async () => {
    const { syncAllGamesTaxonomy } = await import("../../src/app.js");
    const { prisma } = await import("../../src/prisma.js");
    const prefix = `Teste-${randomUUID()}`;
    const upperGenre = `${prefix}-RPG`;
    const lowerGenre = `${prefix}-rpg`;
    const upperPlatform = `${prefix}-PC`;
    const lowerPlatform = `${prefix}-pc`;
    const games = [];

    try {
      games.push(await createLegacyGame(prisma, prefix, "Maiusculo", [upperGenre], [upperPlatform]));
      games.push(await createLegacyGame(prisma, prefix, "Minusculo", [lowerGenre], [lowerPlatform]));

      await syncAllGamesTaxonomy();

      const synced = await prisma.game.findMany({
        where: { id: { in: games.map((game) => game.id) } },
        include: {
          genreLinks: { include: { genre: true } },
          platformLinks: { include: { platform: true } }
        },
        orderBy: { id: "asc" }
      });

      expect(synced[0].genreLinks.map(({ genre }) => genre.name)).toEqual([upperGenre]);
      expect(synced[1].genreLinks.map(({ genre }) => genre.name)).toEqual([lowerGenre]);
      expect(synced[0].platformLinks.map(({ platform }) => platform.name)).toEqual([upperPlatform]);
      expect(synced[1].platformLinks.map(({ platform }) => platform.name)).toEqual([lowerPlatform]);
      expect(synced[0].genres).toEqual([upperGenre]);
      expect(synced[1].genres).toEqual([lowerGenre]);
    } finally {
      await cleanup(prisma, games, prefix);
    }
  });

  it("atualiza updatedAt quando os arrays já estão normalizados", async () => {
    const { syncAllGamesTaxonomy } = await import("../../src/app.js");
    const { prisma } = await import("../../src/prisma.js");
    const prefix = `Teste-${randomUUID()}`;
    const games = [];

    try {
      games.push(await createLegacyGame(prisma, prefix, "Timestamp", [`${prefix}-Ação`], []));
      const before = await prisma.game.findUnique({ where: { id: games[0].id } });
      await new Promise((resolve) => setTimeout(resolve, 30));

      await syncAllGamesTaxonomy();

      const after = await prisma.game.findUnique({ where: { id: games[0].id } });
      expect(after.updatedAt.getTime()).toBeGreaterThan(before.updatedAt.getTime());
    } finally {
      await cleanup(prisma, games, prefix);
    }
  });

  it("é idempotente ao ser executada duas vezes", async () => {
    const { syncAllGamesTaxonomy } = await import("../../src/app.js");
    const { prisma } = await import("../../src/prisma.js");
    const prefix = `Teste-${randomUUID()}`;
    const genre = `${prefix}-Genero`;
    const games = [];

    try {
      games.push(await createLegacyGame(prisma, prefix, "E", [genre], [`${prefix}-Plat`]));

      await syncAllGamesTaxonomy();
      const first = await prisma.gameGenre.findMany({ where: { gameId: games[0].id } });
      await syncAllGamesTaxonomy();
      const second = await prisma.gameGenre.findMany({ where: { gameId: games[0].id } });

      expect(second).toEqual(first);
    } finally {
      await cleanup(prisma, games, prefix);
    }
  });
});

maybeDescribe("ensureLegacyTaxonomySynced via rotas de catálogo", () => {
  it("sincroniza a taxonomia legada na primeira chamada e não repete nas seguintes", async () => {
    process.env.NODE_ENV = "test";
    const { app } = await import("../../src/app.js");
    const { prisma } = await import("../../src/prisma.js");
    const prefix = `Teste-${randomUUID()}`;
    const firstGenre = `${prefix}-Primeiro`;
    const secondGenre = `${prefix}-Segundo`;
    const games = [];

    try {
      games.push(await createLegacyGame(prisma, prefix, "F", [firstGenre], []));

      const first = await request(app).get("/api/genres").expect(200);
      expect(first.body.map((item) => item.name)).toContain(firstGenre);

      games.push(await createLegacyGame(prisma, prefix, "G", [secondGenre], []));

      const second = await request(app).get("/api/genres").expect(200);
      expect(second.body.map((item) => item.name)).not.toContain(secondGenre);
    } finally {
      await cleanup(prisma, games, prefix);
    }
  });
});
