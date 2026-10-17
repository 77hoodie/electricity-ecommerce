import { describe, expect, it, vi } from "vitest";
import { syncGameGenres } from "../../src/app.js";

function createDb(records = []) {
  return {
    genre: {
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
      findMany: vi.fn().mockResolvedValue(records)
    },
    gameGenre: {
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      createMany: vi.fn().mockResolvedValue({ count: 0 })
    },
    game: {
      update: vi.fn().mockResolvedValue({ id: 7 })
    }
  };
}

describe("syncGameGenres", () => {
  it("sincroniza gêneros em lote preservando a ordem e normalização de entrada", async () => {
    const db = createDb([
      { id: 31, name: "Ação" },
      { id: 12, name: "rpg" },
      { id: 24, name: "INDIE" }
    ]);

    const result = await syncGameGenres(
      7,
      [" RPG ", "Indie", "rpg", " Ação ", "", "INDIE"],
      db
    );

    expect(result).toEqual(["rpg", "INDIE", "Ação"]);
    expect(db.genre.createMany).toHaveBeenCalledWith({
      data: [{ name: "rpg" }, { name: "INDIE" }, { name: "Ação" }],
      skipDuplicates: true
    });
    expect(db.genre.findMany).toHaveBeenCalledWith({
      where: { name: { in: ["rpg", "INDIE", "Ação"] } },
      select: { id: true, name: true }
    });
    expect(db.gameGenre.deleteMany).toHaveBeenCalledWith({
      where: { gameId: 7, genreId: { notIn: [12, 24, 31] } }
    });
    expect(db.gameGenre.createMany).toHaveBeenCalledWith({
      data: [
        { gameId: 7, genreId: 12 },
        { gameId: 7, genreId: 24 },
        { gameId: 7, genreId: 31 }
      ],
      skipDuplicates: true
    });
    expect(db.game.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: { genres: ["rpg", "INDIE", "Ação"] }
    });
  });

  it("remove os vínculos e esvazia o array quando a entrada não contém gêneros", async () => {
    const db = createDb();

    const result = await syncGameGenres(7, " , , ", db);

    expect(result).toEqual([]);
    expect(db.genre.createMany).not.toHaveBeenCalled();
    expect(db.genre.findMany).not.toHaveBeenCalled();
    expect(db.gameGenre.deleteMany).toHaveBeenCalledWith({
      where: { gameId: 7 }
    });
    expect(db.gameGenre.createMany).not.toHaveBeenCalled();
    expect(db.game.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: { genres: [] }
    });
  });

  it("faz uma quantidade constante de chamadas Prisma para listas não vazias", async () => {
    const n = 100;
    const names = Array.from({ length: n }, (_, i) => `Gênero ${i}`);
    const records = names.map((name, i) => ({ name, id: i + 1 }));
    const db = createDb(records);

    await syncGameGenres(7, names, db);

    expect(db.genre.createMany).toHaveBeenCalledTimes(1);
    expect(db.genre.findMany).toHaveBeenCalledTimes(1);
    expect(db.gameGenre.deleteMany).toHaveBeenCalledTimes(1);
    expect(db.gameGenre.createMany).toHaveBeenCalledTimes(1);
    expect(db.game.update).toHaveBeenCalledTimes(1);
  });
});
