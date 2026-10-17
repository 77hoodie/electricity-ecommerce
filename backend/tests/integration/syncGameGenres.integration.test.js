import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";

const maybeDescribe = process.env.RUN_INTEGRATION === "true" ? describe : describe.skip;

maybeDescribe("syncGameGenres com PostgreSQL", () => {
  it("cria, substitui e remove os vínculos sem alterar a saída esperada", async () => {
    const { syncGameGenres } = await import("../../src/app.js");
    const { prisma } = await import("../../src/prisma.js");
    const prefix = `Teste-${randomUUID()}`;
    const action = `${prefix}-Ação`;
    const puzzle = `${prefix}-Puzzle`;
    const strategy = `${prefix}-Estratégia`;
    const names = [action, puzzle, strategy];
    let game;

    try {
      game = await prisma.game.create({
        data: {
          title: `Jogo ${prefix}`,
          description: "Teste de sincronização de gêneros",
          price: 1,
          genres: [],
          platforms: [],
          isActive: false
        }
      });

      expect(await syncGameGenres(game.id, [action, puzzle])).toEqual([action, puzzle]);

      const original = await prisma.game.findUnique({
        where: { id: game.id },
        include: { genreLinks: { include: { genre: true } } }
      });

      expect(original.genres).toEqual([action, puzzle]);
      expect(original.genreLinks.map((link) => link.genre.name).sort()).toEqual([action, puzzle].sort());
      const originalPuzzle = original.genreLinks.find((link) => link.genre.name === puzzle).genreId;

      expect(await syncGameGenres(game.id, [puzzle, strategy, puzzle])).toEqual([puzzle, strategy]);

      const changed = await prisma.game.findUnique({
        where: { id: game.id },
        include: { genreLinks: { include: { genre: true } } }
      });

      expect(changed.genres).toEqual([puzzle, strategy]);
      expect(changed.genreLinks.map((link) => link.genre.name).sort()).toEqual([puzzle, strategy].sort());
      expect(changed.genreLinks.find((link) => link.genre.name === puzzle).genreId).toBe(originalPuzzle);

      expect(await syncGameGenres(game.id, [])).toEqual([]);

      const empty = await prisma.game.findUnique({
        where: { id: game.id },
        include: { genreLinks: true }
      });

      expect(empty.genres).toEqual([]);
      expect(empty.genreLinks).toEqual([]);
    } finally {
      if (game) {
        await prisma.game.delete({ where: { id: game.id } });
      }
      await prisma.genre.deleteMany({ where: { name: { in: names } } });
    }
  });
});
