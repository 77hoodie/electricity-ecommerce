import { describe, expect, it } from "vitest";
import { mapRawgGame } from "../../src/rawgMapper.js";

describe("mapeamento RAWG", () => {
  it("converte um jogo da RAWG para o formato local", () => {
    const mapped = mapRawgGame({
      id: 3498,
      name: "Grand Theft Auto V",
      description_raw: "Open world game",
      background_image: "https://example.com/gta.jpg",
      rating: 4.5,
      genres: [{ name: "Ação" }, { name: "Aventura" }],
      platforms: [{ platform: { name: "PC" } }, { platform: { name: "PlayStation" } }],
      released: "2013-09-17"
    }, 79.9);

    expect(mapped.rawgId).toBe(3498);
    expect(mapped.title).toBe("Grand Theft Auto V");
    expect(mapped.price).toBe(79.9);
    expect(mapped.genres).toEqual(["Ação", "Aventura"]);
    expect(mapped.platforms).toEqual(["PC", "PlayStation"]);
  });

  it("aplica fallback quando dados opcionais não vêm da RAWG", () => {
    const mapped = mapRawgGame({ id: 1, name: "Jogo sem dados" }, 10);

    expect(mapped.description).toBe("Descrição não disponível.");
    expect(mapped.coverUrl).toContain("placehold.co");
    expect(mapped.rating).toBe(0);
    expect(mapped.genres).toEqual([]);
    expect(mapped.platforms).toEqual([]);
  });
});
