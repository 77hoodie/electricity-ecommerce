import { describe, expect, it } from "vitest";
import { syncAllGamesTaxonomy } from "../../src/app.js";

function createCatalogTable() {
  const rows = [];
  let nextId = 1;

  return {
    rows,
    createMany: async ({ data, skipDuplicates }) => {
      let count = 0;
      for (const item of data) {
        if (rows.some((row) => row.name === item.name)) {
          if (!skipDuplicates) throw new Error("Registro duplicado");
          continue;
        }
        rows.push({ id: nextId++, name: item.name });
        count += 1;
      }
      return { count };
    },
    findMany: async ({ where }) =>
      rows
        .filter((row) => where.name.in.includes(row.name))
        .map(({ id, name }) => ({ id, name }))
  };
}

function createLinkTable(foreignKey) {
  const rows = [];

  return {
    rows,
    deleteMany: async ({ where }) => {
      const before = rows.length;
      const excluded = where[foreignKey]?.notIn;
      const kept = rows.filter((row) => {
        if (row.gameId !== where.gameId) return true;
        return excluded ? excluded.includes(row[foreignKey]) : false;
      });
      rows.splice(0, rows.length, ...kept);
      return { count: before - rows.length };
    },
    createMany: async ({ data, skipDuplicates }) => {
      let count = 0;
      for (const item of data) {
        const exists = rows.some(
          (row) => row.gameId === item.gameId && row[foreignKey] === item[foreignKey]
        );
        if (exists) {
          if (!skipDuplicates) throw new Error("Vínculo duplicado");
          continue;
        }
        rows.push({ ...item });
        count += 1;
      }
      return { count };
    }
  };
}

function fragmentText(fragment) {
  return fragment.strings ? fragment.strings.join("") : String(fragment.text);
}

function applyRaw(db, strings, values) {
  const statement = strings.join("");

  if (statement.includes("DELETE FROM")) {
    const isGenre = fragmentText(values[0]).includes("GameGenre");
    const rows = isGenre ? db.gameGenre.rows : db.gamePlatform.rows;
    const foreignKey = isGenre ? "genreId" : "platformId";

    for (const entry of JSON.parse(values[1])) {
      const kept = rows.filter(
        (row) => row.gameId !== entry.id || entry.ids.includes(row[foreignKey])
      );
      rows.splice(0, rows.length, ...kept);
    }
    return 0;
  }

  if (statement.includes("UPDATE")) {
    if (db.failOnUpdate) throw db.failOnUpdate;

    for (const entry of JSON.parse(values[1])) {
      const game = db.games.find((item) => item.id === entry.id);
      game.genres = entry.genres;
      game.platforms = entry.platforms;
      db.touched.push(entry.id);
    }
    return 0;
  }

  throw new Error(`Instrução SQL não suportada: ${statement}`);
}

function createDb(initialGames, { failOnUpdate = null } = {}) {
  const games = initialGames.map((game) => ({ ...game }));
  let calls = 0;

  const db = {
    games,
    touched: [],
    failOnUpdate,
    game: {
      findMany: async () =>
        games.map(({ id, genres, platforms }) => ({ id, genres, platforms })),
      update: async ({ where, data }) => {
        if (db.failOnUpdate) throw db.failOnUpdate;
        const game = games.find((item) => item.id === where.id);
        Object.assign(game, data);
        db.touched.push(where.id);
        return game;
      }
    },
    genre: createCatalogTable(),
    platform: createCatalogTable(),
    gameGenre: createLinkTable("genreId"),
    gamePlatform: createLinkTable("platformId"),
    $executeRaw: async (strings, ...values) => applyRaw(db, strings, values),
    calls: () => calls
  };

  for (const key of ["game", "genre", "platform", "gameGenre", "gamePlatform"]) {
    for (const [name, fn] of Object.entries(db[key])) {
      if (typeof fn === "function") {
        db[key][name] = (...args) => {
          calls += 1;
          return fn(...args);
        };
      }
    }
  }

  const rawExecutor = db.$executeRaw;
  db.$executeRaw = (...args) => {
    calls += 1;
    return rawExecutor(...args);
  };

  return db;
}

function createGames(count) {
  return Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    genres: [`Gênero ${index % 5}`, `Gênero ${(index + 1) % 5}`],
    platforms: [`Plataforma ${index % 3}`]
  }));
}

function linkedNames(db, linkTable, catalog, foreignKey, gameId) {
  return db[linkTable].rows
    .filter((row) => row.gameId === gameId)
    .map((row) => db[catalog].rows.find((item) => item.id === row[foreignKey]).name)
    .sort();
}

function genresOf(db, gameId) {
  return linkedNames(db, "gameGenre", "genre", "genreId", gameId);
}

function platformsOf(db, gameId) {
  return linkedNames(db, "gamePlatform", "platform", "platformId", gameId);
}

function snapshot(db) {
  return JSON.stringify({
    games: db.games,
    genre: db.genre.rows,
    platform: db.platform.rows,
    gameGenre: db.gameGenre.rows,
    gamePlatform: db.gamePlatform.rows
  });
}

describe("syncAllGamesTaxonomy", () => {
  it("cria gêneros, plataformas e vínculos de todos os jogos", async () => {
    const db = createDb([
      { id: 1, genres: ["Ação", "RPG"], platforms: ["PC"] },
      { id: 2, genres: ["RPG", "Indie"], platforms: ["PC", "Xbox"] },
      { id: 3, genres: ["Indie"], platforms: ["Linux"] }
    ]);

    const result = await syncAllGamesTaxonomy(db);

    expect(result).toBeUndefined();
    expect(db.genre.rows.map((row) => row.name).sort()).toEqual(["Ação", "Indie", "RPG"]);
    expect(db.platform.rows.map((row) => row.name).sort()).toEqual(["Linux", "PC", "Xbox"]);
    expect(genresOf(db, 1)).toEqual(["Ação", "RPG"]);
    expect(genresOf(db, 2)).toEqual(["Indie", "RPG"]);
    expect(genresOf(db, 3)).toEqual(["Indie"]);
    expect(platformsOf(db, 1)).toEqual(["PC"]);
    expect(platformsOf(db, 2)).toEqual(["PC", "Xbox"]);
    expect(platformsOf(db, 3)).toEqual(["Linux"]);
  });

  it("normaliza os arrays do jogo removendo espaços, vazios e duplicatas sem diferenciar maiúsculas", async () => {
    const db = createDb([
      { id: 5, genres: [" RPG ", "rpg", "Ação", ""], platforms: ["  PC", "pc ", " "] }
    ]);

    await syncAllGamesTaxonomy(db);

    expect(db.games[0].genres).toEqual(["rpg", "Ação"]);
    expect(db.games[0].platforms).toEqual(["pc"]);
    expect(genresOf(db, 5)).toEqual(["Ação", "rpg"]);
    expect(platformsOf(db, 5)).toEqual(["pc"]);
  });

  it("mantém um mesmo gênero compartilhado por vários jogos como um único registro", async () => {
    const db = createDb([
      { id: 1, genres: ["Indie"], platforms: [] },
      { id: 2, genres: ["Indie"], platforms: [] },
      { id: 3, genres: ["Indie"], platforms: [] }
    ]);

    await syncAllGamesTaxonomy(db);

    expect(db.genre.rows).toHaveLength(1);
    expect(db.gameGenre.rows).toHaveLength(3);
    expect(new Set(db.gameGenre.rows.map((row) => row.genreId)).size).toBe(1);
  });

  it("remove vínculos obsoletos e preserva os que continuam válidos", async () => {
    const db = createDb([{ id: 1, genres: ["Ação"], platforms: ["PC"] }]);
    await db.genre.createMany({ data: [{ name: "Antigo" }, { name: "Ação" }] });
    await db.platform.createMany({ data: [{ name: "Obsoleta" }, { name: "PC" }] });
    await db.gameGenre.createMany({
      data: [{ gameId: 1, genreId: 1 }, { gameId: 1, genreId: 2 }]
    });
    await db.gamePlatform.createMany({
      data: [{ gameId: 1, platformId: 1 }, { gameId: 1, platformId: 2 }]
    });

    await syncAllGamesTaxonomy(db);

    expect(genresOf(db, 1)).toEqual(["Ação"]);
    expect(platformsOf(db, 1)).toEqual(["PC"]);
    expect(db.gameGenre.rows).toHaveLength(1);
    expect(db.gamePlatform.rows).toHaveLength(1);
    expect(db.gameGenre.rows[0].genreId).toBe(2);
    expect(db.gamePlatform.rows[0].platformId).toBe(2);
  });

  it("não afeta os vínculos de um jogo ao sincronizar outro", async () => {
    const db = createDb([
      { id: 1, genres: ["Ação"], platforms: [] },
      { id: 2, genres: [], platforms: [] }
    ]);
    await db.genre.createMany({ data: [{ name: "Ação" }] });
    await db.gameGenre.createMany({ data: [{ gameId: 2, genreId: 1 }] });

    await syncAllGamesTaxonomy(db);

    expect(genresOf(db, 1)).toEqual(["Ação"]);
    expect(genresOf(db, 2)).toEqual([]);
  });

  it("esvazia vínculos e arrays de jogos sem gêneros nem plataformas", async () => {
    const db = createDb([
      { id: 1, genres: null, platforms: undefined },
      { id: 2, genres: [], platforms: ["", "   "] }
    ]);

    await syncAllGamesTaxonomy(db);

    expect(db.games[0].genres).toEqual([]);
    expect(db.games[0].platforms).toEqual([]);
    expect(db.games[1].genres).toEqual([]);
    expect(db.games[1].platforms).toEqual([]);
    expect(db.gameGenre.rows).toEqual([]);
    expect(db.gamePlatform.rows).toEqual([]);
    expect(db.genre.rows).toEqual([]);
    expect(db.platform.rows).toEqual([]);
  });

  it("não cria nada quando não há jogos", async () => {
    const db = createDb([]);

    await syncAllGamesTaxonomy(db);

    expect(db.genre.rows).toEqual([]);
    expect(db.platform.rows).toEqual([]);
    expect(db.gameGenre.rows).toEqual([]);
    expect(db.gamePlatform.rows).toEqual([]);
  });

  it("é idempotente ao ser executada duas vezes", async () => {
    const db = createDb([
      { id: 1, genres: ["Ação", " RPG "], platforms: ["PC", "Xbox"] },
      { id: 2, genres: ["RPG"], platforms: ["PC"] }
    ]);

    await syncAllGamesTaxonomy(db);
    const first = snapshot(db);
    await syncAllGamesTaxonomy(db);

    expect(snapshot(db)).toBe(first);
  });
  it("preserva nomes que diferem apenas por maiúsculas entre jogos", async () => {
    const db = createDb([
      { id: 1, genres: ["RPG"], platforms: ["PC"] },
      { id: 2, genres: ["rpg"], platforms: ["pc"] }
    ]);

    await syncAllGamesTaxonomy(db);

    expect(db.genre.rows.map((row) => row.name).sort()).toEqual(["RPG", "rpg"]);
    expect(db.platform.rows.map((row) => row.name).sort()).toEqual(["PC", "pc"]);
    expect(genresOf(db, 1)).toEqual(["RPG"]);
    expect(genresOf(db, 2)).toEqual(["rpg"]);
    expect(platformsOf(db, 1)).toEqual(["PC"]);
    expect(platformsOf(db, 2)).toEqual(["pc"]);
  });

  it("atualiza todos os jogos, inclusive os que já estão normalizados", async () => {
    const db = createDb([
      { id: 1, genres: ["Ação"], platforms: ["PC"] },
      { id: 2, genres: [], platforms: [] }
    ]);

    await syncAllGamesTaxonomy(db);

    expect([...db.touched].sort()).toEqual([1, 2]);
  });

  it("faz uma quantidade constante de chamadas ao banco independentemente do número de jogos", async () => {
    const small = createDb(createGames(5));
    const large = createDb(createGames(200));

    await syncAllGamesTaxonomy(small);
    await syncAllGamesTaxonomy(large);

    expect(large.calls()).toBe(small.calls());
    expect(large.calls()).toBeLessThanOrEqual(10);
    expect(genresOf(large, 200)).toHaveLength(2);
    expect(platformsOf(large, 200)).toHaveLength(1);
  });

  it("propaga erros de integridade referencial sem ocultá-los", async () => {
    const db = createDb([
      { id: 1, genres: ["Ação"], platforms: [] }
    ]);
    db.gameGenre.createMany = async () => {
      const error = new Error("Falha de integridade referencial");
      error.code = "P2003";
      throw error;
    };

    await expect(syncAllGamesTaxonomy(db)).rejects.toMatchObject({ code: "P2003" });
  });

  it("propaga falhas do banco ao atualizar os jogos", async () => {
    const error = Object.assign(new Error("Registro ausente"), { code: "P2025" });
    const db = createDb(
      [{ id: 1, genres: ["Ação"], platforms: [] }],
      { failOnUpdate: error }
    );

    await expect(syncAllGamesTaxonomy(db)).rejects.toMatchObject({ code: "P2025" });
  });
});
