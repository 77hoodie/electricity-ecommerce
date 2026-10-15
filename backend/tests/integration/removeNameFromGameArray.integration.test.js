import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";

const maybeDescribe = process.env.RUN_INTEGRATION === "true" ? describe : describe.skip;

maybeDescribe("removeNameFromGameArray com PostgreSQL", () => {
  for (const field of ["genres", "platforms"]) {
    it(`remove ${field} de todos os jogos sem modificar os outros valores`, async () => {
      const { removeNameFromGameArray } = await import("../../src/app.js");
      const { prisma } = await import("../../src/prisma.js");
      const prefix = `Teste-Remocao-${randomUUID()}`;
      const target = `${prefix}-O'Connor "Especial"`;
      const other = `${prefix}-Outro`;
      const arrays = [[target, other, target], [other, target], [other]];
      const games = [];

      try {
        for (const values of arrays) {
          const game = await prisma.game.create({
            data: {
              title: `${prefix}-${games.length}`,
              description: "Teste de remoção em lote",
              price: 1,
              genres: field === "genres" ? values : ["RPG"],
              platforms: field === "platforms" ? values : ["PC"],
              isActive: false
            }
          });
          games.push(game);
        }

        await prisma.$transaction(async (tx) => {
          await removeNameFromGameArray(field, target, tx);
        });

        for (const [index, game] of games.entries()) {
          const actual = await prisma.game.findUnique({ where: { id: game.id } });
          expect(actual[field]).toEqual([other]);
          expect(actual[field === "genres" ? "platforms" : "genres"]).toEqual(
            field === "genres" ? ["PC"] : ["RPG"]
          );
          if (index === 2) {
            expect(actual.updatedAt.getTime()).toBe(game.updatedAt.getTime());
          }
        }
      } finally {
        await prisma.game.deleteMany({ where: { title: { startsWith: prefix } } });
      }
    });
  }
});
