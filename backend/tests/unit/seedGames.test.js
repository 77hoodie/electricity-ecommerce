import { describe, expect, it } from "vitest";
import { parseStringList, seedGames } from "../../prisma/seedGames.js";

function createRecordingDb({ failWith } = {}) {
  const calls = [];

  function build(path) {
    return new Proxy(function target() {}, {
      get: (_, property) => (property === "then" ? undefined : build([...path, String(property)])),
      apply: () => {
        calls.push(path.join("."));
        return failWith ? Promise.reject(failWith) : Promise.resolve(undefined);
      }
    });
  }

  return { db: build([]), calls };
}

describe("parseStringList", () => {
  it("remove espaços, itens vazios e duplicatas sem diferenciar maiúsculas", () => {
    expect(parseStringList(["Indie", " indie ", "", "RPG"])).toEqual(["indie", "RPG"]);
  });

  it("aceita texto separado por vírgulas", () => {
    expect(parseStringList("Ação, Aventura ,,ação")).toEqual(["ação", "Aventura"]);
  });

  it("converte itens não textuais para texto", () => {
    expect(parseStringList([1, " 2 "])).toEqual(["1", "2"]);
  });

  it("retorna lista vazia para valores que não são lista nem texto", () => {
    expect(parseStringList(null)).toEqual([]);
    expect(parseStringList(undefined)).toEqual([]);
    expect(parseStringList(42)).toEqual([]);
    expect(parseStringList({})).toEqual([]);
  });

  it("mantém a posição da primeira ocorrência e o texto da última", () => {
    expect(parseStringList(["B", "a", "A", "b"])).toEqual(["b", "A"]);
  });
});

describe("seedGames", () => {
  it("não consulta o banco quando a lista de jogos é vazia", async () => {
    const { db, calls } = createRecordingDb();

    await seedGames([], db);

    expect(calls).toHaveLength(0);
  });

  it("preserva o rawgId inicial e reativa títulos repetidos no mesmo lote", async () => {
    const created = [];
    const db = {
      game: {
        findMany: async () => [],
        createManyAndReturn: async ({ data }) => {
          created.push(...data);
          return data.map(({ title }, index) => ({ id: index + 1, title }));
        }
      },
      genre: { createMany: async () => undefined, findMany: async () => [] },
      platform: { createMany: async () => undefined, findMany: async () => [] },
      $executeRaw: async () => 0
    };

    await seedGames([
      { title: "Duplicado", description: "primeiro", price: 1, rawgId: 111, isActive: false },
      { title: "Duplicado", description: "último", price: 2, rawgId: 222, isActive: false }
    ], db);

    expect(created).toHaveLength(1);
    expect(created[0]).toMatchObject({
      title: "Duplicado",
      description: "último",
      price: 2,
      rawgId: 111,
      isActive: true
    });
    expect(created[0].updatedAt).toBeInstanceOf(Date);
  });

  it("limita o tamanho dos lotes sem copiar toda a entrada", async () => {
    const sizes = [];
    const games = Array.from({ length: 77 }, (_, index) => ({
      title: `Lote-${index}`,
      description: "Jogo de teste",
      price: 1,
      genres: [],
      platforms: []
    }));
    let nextId = 1;
    const db = {
      game: {
        findMany: async ({ where }) => {
          sizes.push(where.title.in.length);
          return [];
        },
        createManyAndReturn: async ({ data }) => data.map(({ title }) => ({ id: nextId++, title }))
      },
      genre: { createMany: async () => undefined, findMany: async () => [] },
      platform: { createMany: async () => undefined, findMany: async () => [] },
      $executeRaw: async () => 0
    };

    await seedGames(games, db);

    expect(sizes).toEqual([32, 32, 13]);
    expect(games).toHaveLength(77);
    expect(games[0].title).toBe("Lote-0");
  });

  it("propaga o erro lançado pelo banco", async () => {
    const failure = new Error("falha simulada do banco");
    const { db } = createRecordingDb({ failWith: failure });
    const games = [
      {
        title: "Jogo de teste",
        description: "Teste",
        price: 1,
        genres: ["Ação"],
        platforms: ["PC"]
      }
    ];

    await expect(seedGames(games, db)).rejects.toBe(failure);
  });
});
