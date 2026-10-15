import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";

const maybeDescribe = process.env.RUN_INTEGRATION === "true" ? describe : describe.skip;

maybeDescribe("replaceNameInGameArray com PostgreSQL", () => {
  for (const field of ["genres", "platforms"]) {
    it(`substitui ${field} preservando ordem, normalização e demais registros`, async () => {
      const { replaceNameInGameArray } = await import("../../src/app.js");
      const { prisma } = await import("../../src/prisma.js");
      const prefix = `Teste-Substituicao-${randomUUID()}`;
      const oldName = `${prefix}-O'Connor`;
      const newName = `${prefix}-Novo`;
      const otherName = `${prefix}-Outro`;
      const unaffected = `${prefix}-NaoAfetado`;
      const starting = [oldName, `  ${otherName}  `, newName, otherName.toUpperCase(), oldName];
      const created = [];

      try {
        for (const [index, values] of [starting, [oldName, otherName], [unaffected]].entries()) {
          created.push(await prisma.game.create({
            data: {
              title: `${prefix}-${index}`,
              description: "Teste de substituição em lote",
              price: 1,
              genres: field === "genres" ? values : ["RPG"],
              platforms: field === "platforms" ? values : ["PC"],
              isActive: false
            }
          }));
        }

        await prisma.$transaction(async (tx) => {
          await replaceNameInGameArray(field, oldName, newName, tx);
        });

        const games = await Promise.all(created.map((game) =>
          prisma.game.findUnique({ where: { id: game.id } })
        ));

        expect(games[0][field]).toEqual([newName, otherName.toUpperCase()]);
        expect(games[1][field]).toEqual([newName, otherName]);
        expect(games[2][field]).toEqual([unaffected]);
        for (const game of games) {
          expect(game[field === "genres" ? "platforms" : "genres"]).toEqual(
            field === "genres" ? ["PC"] : ["RPG"]
          );
        }
        expect(games[2].updatedAt.getTime()).toBe(created[2].updatedAt.getTime());
      } finally {
        await prisma.game.deleteMany({ where: { title: { startsWith: prefix } } });
      }
    }, 15000);
  }
});
