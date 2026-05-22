import express from "express";
import cors from "cors";
import axios from "axios";
import dotenv from "dotenv";
import { prisma } from "./prisma.js";
import { HttpError } from "./errors.js";
import { assertCanAddToCart, calculateCartTotal } from "./cartRules.js";
import { mapRawgGame } from "./rawgMapper.js";
import {
  serializeCartItem,
  serializeGame,
  serializeGenre,
  serializeLibraryItem,
  serializeOrder
} from "./serializers.js";

dotenv.config();

const RAWG_BASE_URL = "https://api.rawg.io/api";

export const app = express();

app.use(cors({ origin: ["http://localhost:5173", "http://127.0.0.1:5173"] }));
app.use(express.json());

function parseId(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new HttpError(400, "ID inválido");
  }
  return id;
}

function parseStringList(value) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === "string") {
    return value.split(",").map((item) => item.trim()).filter(Boolean);
  }
  return [];
}

async function getCartItems() {
  return prisma.cartItem.findMany({
    include: { game: true },
    orderBy: { createdAt: "asc" }
  });
}

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", message: "Electricity API rodando", database: "PostgreSQL + Prisma" });
});

// Games CRUD
app.get("/api/games", async (req, res, next) => {
  try {
    const search = req.query.search?.toString().trim();
    const games = await prisma.game.findMany({
      where: {
        isActive: true,
        ...(search ? { title: { contains: search, mode: "insensitive" } } : {})
      },
      orderBy: { createdAt: "desc" }
    });
    res.json(games.map(serializeGame));
  } catch (error) {
    next(error);
  }
});

app.get("/api/games/:id", async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const game = await prisma.game.findUnique({ where: { id } });
    if (!game || !game.isActive) throw new HttpError(404, "Jogo não encontrado");
    res.json(serializeGame(game));
  } catch (error) {
    next(error);
  }
});

app.post("/api/games", async (req, res, next) => {
  try {
    const { title, description, price, coverUrl, rating = 0, releaseDate } = req.body;

    if (!title?.trim()) throw new HttpError(400, "Título é obrigatório");
    if (price === undefined || Number(price) < 0) throw new HttpError(400, "Preço inválido");

    const game = await prisma.game.create({
      data: {
        title: title.trim(),
        description: description?.trim() || "Descrição não disponível.",
        price: Number(price),
        coverUrl: coverUrl?.trim() || "https://placehold.co/600x400?text=Electricity",
        rating: Number(rating) || 0,
        genres: parseStringList(req.body.genres),
        platforms: parseStringList(req.body.platforms),
        releaseDate: releaseDate ? new Date(releaseDate) : null,
        isActive: true
      }
    });

    res.status(201).json(serializeGame(game));
  } catch (error) {
    next(error);
  }
});

app.put("/api/games/:id", async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const current = await prisma.game.findUnique({ where: { id } });
    if (!current || !current.isActive) throw new HttpError(404, "Jogo não encontrado");

    const data = {};
    if (req.body.title !== undefined) {
      if (!req.body.title?.trim()) throw new HttpError(400, "Título é obrigatório");
      data.title = req.body.title.trim();
    }
    if (req.body.description !== undefined) data.description = req.body.description?.trim() || "Descrição não disponível.";
    if (req.body.price !== undefined) {
      if (Number(req.body.price) < 0) throw new HttpError(400, "Preço inválido");
      data.price = Number(req.body.price);
    }
    if (req.body.coverUrl !== undefined) data.coverUrl = req.body.coverUrl?.trim() || "https://placehold.co/600x400?text=Electricity";
    if (req.body.rating !== undefined) data.rating = Number(req.body.rating) || 0;
    if (req.body.genres !== undefined) data.genres = parseStringList(req.body.genres);
    if (req.body.platforms !== undefined) data.platforms = parseStringList(req.body.platforms);
    if (req.body.releaseDate !== undefined) data.releaseDate = req.body.releaseDate ? new Date(req.body.releaseDate) : null;

    const game = await prisma.game.update({ where: { id }, data });
    res.json(serializeGame(game));
  } catch (error) {
    next(error);
  }
});

app.delete("/api/games/:id", async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const current = await prisma.game.findUnique({ where: { id } });
    if (!current || !current.isActive) throw new HttpError(404, "Jogo não encontrado");
    await prisma.game.update({ where: { id }, data: { isActive: false } });
    await prisma.cartItem.deleteMany({ where: { gameId: id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// Genres CRUD (segunda tela CRUD)
app.get("/api/genres", async (_req, res, next) => {
  try {
    const genres = await prisma.genre.findMany({ orderBy: { name: "asc" } });
    res.json(genres.map(serializeGenre));
  } catch (error) {
    next(error);
  }
});

app.post("/api/genres", async (req, res, next) => {
  try {
    const name = req.body.name?.trim();
    if (!name) throw new HttpError(400, "Nome do gênero é obrigatório");

    const genre = await prisma.genre.create({ data: { name } });
    res.status(201).json(serializeGenre(genre));
  } catch (error) {
    if (error.code === "P2002") return next(new HttpError(409, "Já existe um gênero com esse nome"));
    next(error);
  }
});

app.put("/api/genres/:id", async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const name = req.body.name?.trim();
    if (!name) throw new HttpError(400, "Nome do gênero é obrigatório");

    const genre = await prisma.genre.update({ where: { id }, data: { name } });
    res.json(serializeGenre(genre));
  } catch (error) {
    if (error.code === "P2025") return next(new HttpError(404, "Gênero não encontrado"));
    if (error.code === "P2002") return next(new HttpError(409, "Já existe um gênero com esse nome"));
    next(error);
  }
});

app.delete("/api/genres/:id", async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    await prisma.genre.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    if (error.code === "P2025") return next(new HttpError(404, "Gênero não encontrado"));
    next(error);
  }
});

// RAWG integration
app.get("/api/rawg/search", async (req, res, next) => {
  const { query } = req.query;

  try {
    if (!process.env.RAWG_API_KEY) {
      throw new HttpError(500, "Configure RAWG_API_KEY no arquivo .env do back-end");
    }
    if (!query) throw new HttpError(400, "Informe o parâmetro query");

    const response = await axios.get(`${RAWG_BASE_URL}/games`, {
      params: {
        key: process.env.RAWG_API_KEY,
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
    if (error.response) return next(new HttpError(502, "Erro ao consultar a RAWG API"));
    next(error);
  }
});

app.post("/api/rawg/import/:rawgId", async (req, res, next) => {
  try {
    const rawgId = parseId(req.params.rawgId);
    const price = req.body.price === undefined ? 99.9 : Number(req.body.price);

    if (!process.env.RAWG_API_KEY) {
      throw new HttpError(500, "Configure RAWG_API_KEY no arquivo .env do back-end");
    }
    if (Number.isNaN(price) || price < 0) throw new HttpError(400, "Preço inválido");

    const alreadyImported = await prisma.game.findUnique({ where: { rawgId } });
    if (alreadyImported) {
      throw new HttpError(409, "Este jogo já foi importado");
    }

    const response = await axios.get(`${RAWG_BASE_URL}/games/${rawgId}`, {
      params: { key: process.env.RAWG_API_KEY }
    });

    const game = await prisma.game.create({ data: mapRawgGame(response.data, price) });
    res.status(201).json(serializeGame(game));
  } catch (error) {
    if (error.response) return next(new HttpError(502, "Erro ao importar jogo da RAWG API"));
    next(error);
  }
});

// Cart and checkout
app.get("/api/cart", async (_req, res, next) => {
  try {
    const items = await getCartItems();
    res.json({
      items: items.map(serializeCartItem),
      total: calculateCartTotal(items)
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/cart/items", async (req, res, next) => {
  try {
    const gameId = parseId(req.body.gameId);
    const [game, existingCartItem, existingLibraryItem] = await Promise.all([
      prisma.game.findUnique({ where: { id: gameId } }),
      prisma.cartItem.findUnique({ where: { gameId } }),
      prisma.libraryItem.findUnique({ where: { gameId } })
    ]);

    assertCanAddToCart({ game, existingCartItem, existingLibraryItem });

    const item = await prisma.cartItem.create({
      data: { gameId, priceAtMoment: game.price },
      include: { game: true }
    });

    res.status(201).json(serializeCartItem(item));
  } catch (error) {
    next(error);
  }
});

app.delete("/api/cart/items/:id", async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    await prisma.cartItem.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    if (error.code === "P2025") return next(new HttpError(404, "Item não encontrado no carrinho"));
    next(error);
  }
});

app.delete("/api/cart", async (_req, res, next) => {
  try {
    await prisma.cartItem.deleteMany();
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

app.post("/api/orders/checkout", async (_req, res, next) => {
  try {
    const cartItems = await getCartItems();
    if (cartItems.length === 0) throw new HttpError(400, "Carrinho vazio");

    const total = calculateCartTotal(cartItems);

    const order = await prisma.$transaction(async (tx) => {
      const createdOrder = await tx.order.create({
        data: {
          total,
          status: "PAID",
          items: {
            create: cartItems.map((item) => ({
              gameId: item.gameId,
              priceAtPurchase: item.priceAtMoment
            }))
          }
        },
        include: { items: { include: { game: true } } }
      });

      for (const item of cartItems) {
        await tx.libraryItem.upsert({
          where: { gameId: item.gameId },
          update: {},
          create: { gameId: item.gameId }
        });
      }

      await tx.cartItem.deleteMany();
      return createdOrder;
    });

    res.status(201).json(serializeOrder(order));
  } catch (error) {
    next(error);
  }
});

app.get("/api/library", async (_req, res, next) => {
  try {
    const libraryItems = await prisma.libraryItem.findMany({
      include: { game: true },
      orderBy: { purchasedAt: "desc" }
    });
    res.json(libraryItems.map(serializeLibraryItem));
  } catch (error) {
    next(error);
  }
});

app.get("/api/orders", async (_req, res, next) => {
  try {
    const orders = await prisma.order.findMany({
      include: { items: { include: { game: true } } },
      orderBy: { createdAt: "desc" }
    });
    res.json(orders.map(serializeOrder));
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  const status = error.status || 500;
  const message = error.message || "Erro interno no servidor";
  res.status(status).json({ message });
});
