import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";

const maybeDescribe = process.env.RUN_INTEGRATION === "true" ? describe : describe.skip;

maybeDescribe("syncGamePlatforms com PostgreSQL", () => {
  it("cria, substitui e remove os vínculos sem alterar a saída esperada", async () => {
    const { syncGamePlatforms } = await import("../../src/app.js");
    const { prisma } = await import("../../src/prisma.js");
    const prefix = `Teste-${randomUUID()}`;
    const pc = `${prefix}-PC`;
    const consoleName = `${prefix}-Console`;
    const mobile = `${prefix}-Mobile`;
    const names = [pc, consoleName, mobile];
    let game;

    try {
      game = await prisma.game.create({
        data: {
          title: `Jogo ${prefix}`,
          description: "Teste de sincronização de plataformas",
          price: 1,
          genres: [],
          platforms: [],
          isActive: false
        }
      });

      expect(await syncGamePlatforms(game.id, [pc, consoleName])).toEqual([pc, consoleName]);

      const original = await prisma.game.findUnique({
        where: { id: game.id },
        include: { platformLinks: { include: { platform: true } } }
      });

      expect(original.platforms).toEqual([pc, consoleName]);
      expect(original.platformLinks.map((link) => link.platform.name).sort()).toEqual([pc, consoleName].sort());
      const originalConsoleId = original.platformLinks.find((link) => link.platform.name === consoleName).platformId;

      expect(await syncGamePlatforms(game.id, [consoleName, mobile, consoleName])).toEqual([consoleName, mobile]);

      const changed = await prisma.game.findUnique({
        where: { id: game.id },
        include: { platformLinks: { include: { platform: true } } }
      });

      expect(changed.platforms).toEqual([consoleName, mobile]);
      expect(changed.platformLinks.map((link) => link.platform.name).sort()).toEqual([consoleName, mobile].sort());
      expect(changed.platformLinks.find((link) => link.platform.name === consoleName).platformId).toBe(originalConsoleId);

      expect(await syncGamePlatforms(game.id, [])).toEqual([]);

      const empty = await prisma.game.findUnique({
        where: { id: game.id },
        include: { platformLinks: true }
      });

      expect(empty.platforms).toEqual([]);
      expect(empty.platformLinks).toEqual([]);
    } finally {
      if (game) {
        await prisma.game.delete({ where: { id: game.id } });
      }
      await prisma.platform.deleteMany({ where: { name: { in: names } } });
    }
  });
});
