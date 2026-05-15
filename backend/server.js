import express from "express";
import cors from "cors";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3333;
const RAWG_API_KEY = process.env.RAWG_API_KEY;
const RAWG_BASE_URL = "https://api.rawg.io/api";

app.use(cors({ origin: ["http://localhost:5173", "http://127.0.0.1:5173"] }));
app.use(express.json());

let games = [
  {
    id: 1,
    rawgId: null,
    title: "Hollow Knight",
    description: "Aventura de ação em mundo subterrâneo com exploração e combate.",
    price: 46.99,
    coverUrl: "https://media.rawg.io/media/games/4cf/4cfc6b7f1850590a4634b08bfab308ab.jpg",
    rating: 4.4,
    genres: ["Ação", "Aventura", "Indie"],
    platforms: ["PC", "Nintendo Switch", "PlayStation", "Xbox"],
    releaseDate: "2017-02-24",
    isActive: true
  },
  {
    id: 2,
    rawgId: null,
    title: "Celeste",
    description: "Plataforma desafiador sobre escalar uma montanha e superar limites.",
    price: 36.99,
    coverUrl: "https://media.rawg.io/media/games/23b/23b42b7a896140f4ce1d0df8c42fa012.jpg",
    rating: 4.3,
    genres: ["Plataforma", "Indie"],
    platforms: ["PC", "Nintendo Switch", "PlayStation", "Xbox"],
    releaseDate: "2018-01-25",
    isActive: true
  }
];

let nextGameId = 3;

function mapRawgGame(rawgGame, price = 99.9) {
  return {
    id: nextGameId++,
    rawgId: rawgGame.id,
    title: rawgGame.name,
    description: rawgGame.description_raw || rawgGame.description || "Descrição não disponível.",
    price: Number(price),
    coverUrl: rawgGame.background_image || "https://placehold.co/600x400?text=GameHub",
    rating: rawgGame.rating || 0,
    genres: Array.isArray(rawgGame.genres) ? rawgGame.genres.map((genre) => genre.name) : [],
    platforms: Array.isArray(rawgGame.platforms)
      ? rawgGame.platforms.map((item) => item.platform?.name).filter(Boolean)
      : [],
    releaseDate: rawgGame.released || null,
    isActive: true
  };
}

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", message: "GameHub API rodando" });
});

app.get("/api/games", (_req, res) => {
  res.json(games.filter((game) => game.isActive));
});

app.get("/api/games/:id", (req, res) => {
  const game = games.find((item) => item.id === Number(req.params.id));

  if (!game) {
    return res.status(404).json({ message: "Jogo não encontrado" });
  }

  res.json(game);
});

app.post("/api/games", (req, res) => {
  const { title, description, price, coverUrl, genres = [], platforms = [] } = req.body;

  if (!title || price === undefined) {
    return res.status(400).json({ message: "Título e preço são obrigatórios" });
  }

  const game = {
    id: nextGameId++,
    rawgId: null,
    title,
    description: description || "Descrição não disponível.",
    price: Number(price),
    coverUrl: coverUrl || "https://placehold.co/600x400?text=GameHub",
    rating: 0,
    genres,
    platforms,
    releaseDate: null,
    isActive: true
  };

  games.push(game);
  res.status(201).json(game);
});

app.put("/api/games/:id", (req, res) => {
  const index = games.findIndex((item) => item.id === Number(req.params.id));

  if (index === -1) {
    return res.status(404).json({ message: "Jogo não encontrado" });
  }

  games[index] = { ...games[index], ...req.body, id: games[index].id };
  res.json(games[index]);
});

app.delete("/api/games/:id", (req, res) => {
  const game = games.find((item) => item.id === Number(req.params.id));

  if (!game) {
    return res.status(404).json({ message: "Jogo não encontrado" });
  }

  game.isActive = false;
  res.status(204).send();
});

app.get("/api/rawg/search", async (req, res) => {
  const { query } = req.query;

  if (!RAWG_API_KEY) {
    return res.status(500).json({ message: "Configure RAWG_API_KEY no arquivo .env do back-end" });
  }

  if (!query) {
    return res.status(400).json({ message: "Informe o parâmetro query" });
  }

  try {
    const response = await axios.get(`${RAWG_BASE_URL}/games`, {
      params: {
        key: RAWG_API_KEY,
        search: query,
        page_size: 8
      }
    });

    const results = response.data.results.map((game) => ({
      rawgId: game.id,
      title: game.name,
      coverUrl: game.background_image,
      rating: game.rating,
      releaseDate: game.released,
      genres: game.genres?.map((genre) => genre.name) || [],
      platforms: game.platforms?.map((item) => item.platform?.name).filter(Boolean) || []
    }));

    res.json(results);
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(502).json({ message: "Erro ao consultar a RAWG API" });
  }
});

app.post("/api/rawg/import/:rawgId", async (req, res) => {
  const { rawgId } = req.params;
  const { price = 99.9 } = req.body;

  if (!RAWG_API_KEY) {
    return res.status(500).json({ message: "Configure RAWG_API_KEY no arquivo .env do back-end" });
  }

  const alreadyImported = games.find((game) => game.rawgId === Number(rawgId));

  if (alreadyImported) {
    return res.status(409).json({ message: "Este jogo já foi importado", game: alreadyImported });
  }

  try {
    const response = await axios.get(`${RAWG_BASE_URL}/games/${rawgId}`, {
      params: { key: RAWG_API_KEY }
    });

    const importedGame = mapRawgGame(response.data, price);
    games.push(importedGame);

    res.status(201).json(importedGame);
  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(502).json({ message: "Erro ao importar jogo da RAWG API" });
  }
});

app.listen(PORT, () => {
  console.log(`GameHub API rodando em http://localhost:${PORT}`);
});
