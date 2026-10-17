import { describe, expect, it, vi } from "vitest";
import { replaceNameInGameArray } from "../../src/app.js";

function createDb(games) {
  return {
    game: {
      findMany: vi.fn().mockResolvedValue(games),
      update: vi.fn()
    },
    $executeRaw: vi.fn().mockResolvedValue(games.length)
  };
}

describe("replaceNameInGameArray", () => {
  it("preserva a normalização, a ordem e a regra de duplicatas", async () => {
    const db = createDb([
      { id: 7, genres: ["Antigo", "  RPG  ", "Novo", "rpg", "Antigo"] },
      { id: 8, genres: ["Antigo", "Aventura"] }
    ]);

    await replaceNameInGameArray("genres", "Antigo", "Novo", db);

    expect(db.game.findMany).toHaveBeenCalledWith({
      where: { genres: { has: "Antigo" } },
      select: { id: true, genres: true }
    });
    expect(db.game.update).not.toHaveBeenCalled();
    expect(db.$executeRaw).toHaveBeenCalledTimes(1);

    const interpolation = db.$executeRaw.mock.calls[0].slice(1);
    const payload = interpolation.find((value) => typeof value === "string" && value.startsWith("[{"));
    expect(JSON.parse(payload)).toEqual([
      { id: 7, values: ["Novo", "rpg"] },
      { id: 8, values: ["Novo", "Aventura"] }
    ]);
  });

  it("não atualiza o banco quando não há jogos para renomear", async () => {
    const db = createDb([]);
    await replaceNameInGameArray("platforms", "PS4", "PS5", db);
    expect(db.$executeRaw).not.toHaveBeenCalled();
  });

  it("faz duas chamadas Prisma independentemente do número de jogos", async () => {
    const db = createDb(Array.from({ length: 100 }, (_, i) => ({
      id: i + 1,
      platforms: ["PS4", "PS5"]
    })));
    await replaceNameInGameArray("platforms", "PS4", "PS5", db);
    expect(db.game.findMany).toHaveBeenCalledTimes(1);
    expect(db.$executeRaw).toHaveBeenCalledTimes(1);
    expect(db.game.update).not.toHaveBeenCalled();
  });

  it("rejeita campos fora de genres e platforms", async () => {
    const db = createDb([]);
    await expect(replaceNameInGameArray("title", "A", "B", db)).rejects.toThrow("Campo inválido");
    expect(db.game.findMany).not.toHaveBeenCalled();
  });
});
