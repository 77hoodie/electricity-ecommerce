import { describe, expect, it, vi } from "vitest";
import { syncGamePlatforms } from "../../src/app.js";

function createDb(records = []) {
  return {
    platform: {
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
      findMany: vi.fn().mockResolvedValue(records)
    },
    gamePlatform: {
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      createMany: vi.fn().mockResolvedValue({ count: 0 })
    },
    game: {
      update: vi.fn().mockResolvedValue({ id: 7 })
    }
  };
}

describe("syncGamePlatforms", () => {
  it("sincroniza plataformas em lote preservando a ordem e normalização de entrada", async () => {
    const db = createDb([
      { id: 18, name: "CONSOLE" },
      { id: 42, name: "Mobile" },
      { id: 9, name: "pc" }
    ]);

    const result = await syncGamePlatforms(
      7,
      [" PC ", "Console", "pc", " Mobile ", "", "CONSOLE"],
      db
    );

    expect(result).toEqual(["pc", "CONSOLE", "Mobile"]);
    expect(db.platform.createMany).toHaveBeenCalledWith({
      data: [{ name: "pc" }, { name: "CONSOLE" }, { name: "Mobile" }],
      skipDuplicates: true
    });
    expect(db.platform.findMany).toHaveBeenCalledWith({
      where: { name: { in: ["pc", "CONSOLE", "Mobile"] } },
      select: { id: true, name: true }
    });
    expect(db.gamePlatform.deleteMany).toHaveBeenCalledWith({
      where: { gameId: 7, platformId: { notIn: [9, 18, 42] } }
    });
    expect(db.gamePlatform.createMany).toHaveBeenCalledWith({
      data: [
        { gameId: 7, platformId: 9 },
        { gameId: 7, platformId: 18 },
        { gameId: 7, platformId: 42 }
      ],
      skipDuplicates: true
    });
    expect(db.game.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: { platforms: ["pc", "CONSOLE", "Mobile"] }
    });
  });

  it("remove os vínculos e esvazia o array quando a lista está vazia", async () => {
    const db = createDb();

    const result = await syncGamePlatforms(7, " , , ", db);

    expect(result).toEqual([]);
    expect(db.platform.createMany).not.toHaveBeenCalled();
    expect(db.platform.findMany).not.toHaveBeenCalled();
    expect(db.gamePlatform.deleteMany).toHaveBeenCalledWith({
      where: { gameId: 7 }
    });
    expect(db.gamePlatform.createMany).not.toHaveBeenCalled();
    expect(db.game.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: { platforms: [] }
    });
  });

  it("faz uma quantidade constante de chamadas Prisma para listas não vazias", async () => {
    const n = 100;
    const names = Array.from({ length: n }, (_, i) => `Plataforma ${i}`);
    const records = names.map((name, i) => ({ name, id: i + 1 }));
    const db = createDb(records);

    await syncGamePlatforms(7, names, db);

    expect(db.platform.createMany).toHaveBeenCalledTimes(1);
    expect(db.platform.findMany).toHaveBeenCalledTimes(1);
    expect(db.gamePlatform.deleteMany).toHaveBeenCalledTimes(1);
    expect(db.gamePlatform.createMany).toHaveBeenCalledTimes(1);
    expect(db.game.update).toHaveBeenCalledTimes(1);
  });
});
