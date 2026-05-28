import express from "express";
import cors from "cors";
import axios from "axios";
import dotenv from "dotenv";
import { createHash } from "node:crypto";
import { prisma } from "./prisma.js";
import { HttpError } from "./errors.js";
import { assertCanAddToCart, calculateCartTotal } from "./cartRules.js";
import { mapRawgGame } from "./rawgMapper.js";
import { validatePromotionInput } from "./promotionRules.js";
import {
  serializeCartItem,
  serializeGame,
  serializeGenre,
  serializeLibraryItem,
  serializeOrder,
  serializePlatform,
  serializePromotion,
  serializeUser,
  serializeWishlistItem
} from "./serializers.js";

dotenv.config();

const RAWG_BASE_URL = "https://api.rawg.io/api";
const FALLBACK_GUEST_CART = "anonymous-visitor-cart";
const GAME_INCLUDE = {
  genreLinks: { include: { genre: true } },
  platformLinks: { include: { platform: true } }
};

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

function hashPassword(password) {
  return createHash("sha256").update(password).digest("hex");
}

function parseStringList(value) {
  const rawItems = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];

  const unique = new Map();
  for (const item of rawItems) {
    const name = String(item).trim();
    if (name) unique.set(name.toLowerCase(), name);
  }

  return [...unique.values()];
}

async function syncGameGenres(gameId, names, db = prisma) {
  const genres = parseStringList(names);
  const records = [];

  for (const name of genres) {
    const genre = await db.genre.upsert({
      where: { name },
      update: {},
      create: { name }
    });
    records.push(genre);
  }

  const ids = records.map((genre) => genre.id);
  if (ids.length === 0) {
    await db.gameGenre.deleteMany({ where: { gameId } });
  } else {
    await db.gameGenre.deleteMany({ where: { gameId, genreId: { notIn: ids } } });
    await db.gameGenre.createMany({
      data: ids.map((genreId) => ({ gameId, genreId })),
      skipDuplicates: true
    });
  }

  await db.game.update({ where: { id: gameId }, data: { genres } });
  return genres;
}

async function syncGamePlatforms(gameId, names, db = prisma) {
  const platforms = parseStringList(names);
  const records = [];

  for (const name of platforms) {
    const platform = await db.platform.upsert({
      where: { name },
      update: {},
      create: { name }
    });
    records.push(platform);
  }

  const ids = records.map((platform) => platform.id);
  if (ids.length === 0) {
    await db.gamePlatform.deleteMany({ where: { gameId } });
  } else {
    await db.gamePlatform.deleteMany({ where: { gameId, platformId: { notIn: ids } } });
    await db.gamePlatform.createMany({
      data: ids.map((platformId) => ({ gameId, platformId })),
      skipDuplicates: true
    });
  }

  await db.game.update({ where: { id: gameId }, data: { platforms } });
  return platforms;
}

async function syncGameTaxonomy(gameId, { genres = [], platforms = [] }, db = prisma) {
  await syncGameGenres(gameId, genres, db);
  await syncGamePlatforms(gameId, platforms, db);
}

async function findGameForResponse(id, db = prisma) {
  return db.game.findUnique({
    where: { id },
    include: GAME_INCLUDE
  });
}

async function replaceNameInGameArray(field, oldName, newName, db = prisma) {
  const games = await db.game.findMany({ where: { [field]: { has: oldName } } });
  for (const game of games) {
    const values = parseStringList((game[field] || []).map((value) => value === oldName ? newName : value));
    await db.game.update({ where: { id: game.id }, data: { [field]: values } });
  }
}

async function removeNameFromGameArray(field, name, db = prisma) {
  const games = await db.game.findMany({ where: { [field]: { has: name } } });
  for (const game of games) {
    const values = (game[field] || []).filter((value) => value !== name);
    await db.game.update({ where: { id: game.id }, data: { [field]: values } });
  }
}

let legacyTaxonomySynced = false;

async function ensureLegacyTaxonomySynced() {
  if (legacyTaxonomySynced) return;

  const games = await prisma.game.findMany({
    select: { id: true, genres: true, platforms: true }
  });

  for (const game of games) {
    await syncGameTaxonomy(game.id, {
      genres: game.genres || [],
      platforms: game.platforms || []
    });
  }

  legacyTaxonomySynced = true;
}

function getGuestCartId(req) {
  return req.header("x-guest-cart-id")?.trim() || FALLBACK_GUEST_CART;
}

function cartOwnerWhere(owner) {
  return owner.userId ? { userId: owner.userId } : { sessionId: owner.sessionId };
}

function cartItemUniqueWhere(owner, gameId) {
  return owner.userId
    ? { userId_gameId: { userId: owner.userId, gameId } }
    : { sessionId_gameId: { sessionId: owner.sessionId, gameId } };
}

async function getRequestUser(req) {
  const userId = req.header("x-user-id");
  if (!userId) return null;

  const id = Number(userId);
  if (!Number.isInteger(id) || id <= 0) return null;

  return prisma.user.findUnique({ where: { id } });
}

async function getCartOwner(req) {
  const user = await getRequestUser(req);
  if (user) return { user, userId: user.id, sessionId: null };
  return { user: null, userId: null, sessionId: getGuestCartId(req) };
}

async function requireAuth(req, _res, next) {
  try {
    const user = await getRequestUser(req);
    if (!user) {
      throw new HttpError(401, "Faça login para continuar");
    }
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

async function requireAdmin(req, _res, next) {
  try {
    const user = await getRequestUser(req);
    if (!user) {
      throw new HttpError(401, "Faça login para acessar a área administrativa");
    }
    if (user.role !== "ADMIN") {
      throw new HttpError(403, "Apenas administradores podem acessar esta função");
    }
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

async function getCartItems(owner, db = prisma) {
  return db.cartItem.findMany({
    where: cartOwnerWhere(owner),
    include: { game: true },
    orderBy: { createdAt: "asc" }
  });
}

async function getCartPayload(owner) {
  const items = await getCartItems(owner);
  return {
    items: items.map(serializeCartItem),
    total: calculateCartTotal(items)
  };
}

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", message: "Electricity API rodando", database: "PostgreSQL + Prisma" });
});

// Auth
app.post("/api/auth/register", async (req, res, next) => {
  try {
    const name = req.body.name?.trim();
    const email = req.body.email?.trim().toLowerCase();
    const password = String(req.body.password || "");

    if (!name) throw new HttpError(400, "Nome é obrigatório");
    if (!email || !email.includes("@")) throw new HttpError(400, "E-mail inválido");
    if (password.length < 6) throw new HttpError(400, "A senha deve ter pelo menos 6 caracteres");

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash: hashPassword(password),
        role: "USER"
      }
    });

    res.status(201).json(serializeUser(user));
  } catch (error) {
    if (error.code === "P2002") return next(new HttpError(409, "Já existe uma conta com esse e-mail"));
    next(error);
  }
});

app.post("/api/auth/login", async (req, res, next) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    const password = String(req.body.password || "");

    if (!email || !password) throw new HttpError(400, "Informe e-mail e senha");

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.passwordHash !== hashPassword(password)) {
      throw new HttpError(401, "E-mail ou senha inválidos");
    }

    res.json(serializeUser(user));
  } catch (error) {
    next(error);
  }
});

app.get("/api/auth/me", requireAuth, (req, res) => {
  res.json(serializeUser(req.user));
});

app.put("/api/auth/me", requireAuth, async (req, res, next) => {
  try {
    const data = {};
    if (req.body.name !== undefined) {
      const name = req.body.name?.trim();
      if (!name) throw new HttpError(400, "Nome é obrigatório");
      data.name = name;
    }
    if (req.body.email !== undefined) {
      const email = req.body.email?.trim().toLowerCase();
      if (!email || !email.includes("@")) throw new HttpError(400, "E-mail inválido");
      data.email = email;
    }
    if (req.body.password !== undefined && String(req.body.password).length > 0) {
      const password = String(req.body.password);
      if (password.length < 6) throw new HttpError(400, "A senha deve ter pelo menos 6 caracteres");
      data.passwordHash = hashPassword(password);
    }

    const user = await prisma.user.update({ where: { id: req.user.id }, data });
    res.json(serializeUser(user));
  } catch (error) {
    if (error.code === "P2002") return next(new HttpError(409, "Já existe uma conta com esse e-mail"));
    next(error);
  }
});

// Users CRUD (admin)
app.get("/api/users", requireAdmin, async (_req, res, next) => {
  try {
    const users = await prisma.user.findMany({ orderBy: { createdAt: "desc" } });
    res.json(users.map(serializeUser));
  } catch (error) {
    next(error);
  }
});

app.put("/api/users/:id", requireAdmin, async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const data = {};
    if (req.body.name !== undefined) {
      if (!req.body.name?.trim()) throw new HttpError(400, "Nome é obrigatório");
      data.name = req.body.name.trim();
    }
    if (req.body.email !== undefined) {
      const email = req.body.email?.trim().toLowerCase();
      if (!email || !email.includes("@")) throw new HttpError(400, "E-mail inválido");
      data.email = email;
    }
    if (req.body.role !== undefined) {
      if (!["USER", "ADMIN"].includes(req.body.role)) throw new HttpError(400, "Perfil inválido");
      data.role = req.body.role;
    }
    if (req.body.password !== undefined && String(req.body.password).length > 0) {
      const password = String(req.body.password);
      if (password.length < 6) throw new HttpError(400, "A senha deve ter pelo menos 6 caracteres");
      data.passwordHash = hashPassword(password);
    }

    const user = await prisma.user.update({ where: { id }, data });
    res.json(serializeUser(user));
  } catch (error) {
    if (error.code === "P2025") return next(new HttpError(404, "Usuário não encontrado"));
    if (error.code === "P2002") return next(new HttpError(409, "Já existe uma conta com esse e-mail"));
    next(error);
  }
});

app.delete("/api/users/:id", requireAdmin, async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (id === req.user.id) throw new HttpError(400, "O administrador logado não pode excluir a própria conta");
    await prisma.user.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    if (error.code === "P2025") return next(new HttpError(404, "Usuário não encontrado"));
    next(error);
  }
});

// Games CRUD
app.get("/api/games", async (req, res, next) => {
  try {
    const search = req.query.search?.toString().trim();
    const genre = req.query.genre?.toString().trim();
    const platform = req.query.platform?.toString().trim();

    const filters = [];
    if (genre) {
      filters.push({
        OR: [
          { genres: { has: genre } },
          { genreLinks: { some: { genre: { name: genre } } } }
        ]
      });
    }
    if (platform) {
      filters.push({
        OR: [
          { platforms: { has: platform } },
          { platformLinks: { some: { platform: { name: platform } } } }
        ]
      });
    }

    const games = await prisma.game.findMany({
      where: {
        isActive: true,
        ...(search ? { title: { contains: search, mode: "insensitive" } } : {}),
        ...(filters.length ? { AND: filters } : {})
      },
      include: GAME_INCLUDE,
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
    const game = await findGameForResponse(id);
    if (!game || !game.isActive) throw new HttpError(404, "Jogo não encontrado");
    res.json(serializeGame(game));
  } catch (error) {
    next(error);
  }
});

app.post("/api/games", requireAdmin, async (req, res, next) => {
  try {
    const { title, description, price, coverUrl, rating = 0, releaseDate } = req.body;

    if (!title?.trim()) throw new HttpError(400, "Título é obrigatório");
    if (price === undefined || Number(price) < 0) throw new HttpError(400, "Preço inválido");

    const genres = parseStringList(req.body.genres);
    const platforms = parseStringList(req.body.platforms);

    const game = await prisma.$transaction(async (tx) => {
      const created = await tx.game.create({
        data: {
          title: title.trim(),
          description: description?.trim() || "Descrição não disponível.",
          price: Number(price),
          coverUrl: coverUrl?.trim() || "https://placehold.co/600x400?text=Electricity",
          rating: Number(rating) || 0,
          genres,
          platforms,
          releaseDate: releaseDate ? new Date(releaseDate) : null,
          isActive: true
        }
      });
      await syncGameTaxonomy(created.id, { genres, platforms }, tx);
      return findGameForResponse(created.id, tx);
    });

    res.status(201).json(serializeGame(game));
  } catch (error) {
    next(error);
  }
});

app.put("/api/games/:id", requireAdmin, async (req, res, next) => {
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
    const shouldSyncGenres = req.body.genres !== undefined;
    const shouldSyncPlatforms = req.body.platforms !== undefined;
    const genres = shouldSyncGenres ? parseStringList(req.body.genres) : current.genres;
    const platforms = shouldSyncPlatforms ? parseStringList(req.body.platforms) : current.platforms;
    if (shouldSyncGenres) data.genres = genres;
    if (shouldSyncPlatforms) data.platforms = platforms;
    if (req.body.releaseDate !== undefined) data.releaseDate = req.body.releaseDate ? new Date(req.body.releaseDate) : null;

    const game = await prisma.$transaction(async (tx) => {
      await tx.game.update({ where: { id }, data });
      if (shouldSyncGenres || shouldSyncPlatforms) {
        await syncGameTaxonomy(id, { genres, platforms }, tx);
      }
      return findGameForResponse(id, tx);
    });
    res.json(serializeGame(game));
  } catch (error) {
    next(error);
  }
});

app.delete("/api/games/:id", requireAdmin, async (req, res, next) => {
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

// Genres CRUD
app.get("/api/genres", async (_req, res, next) => {
  try {
    await ensureLegacyTaxonomySynced();
    const genres = await prisma.genre.findMany({ orderBy: { name: "asc" } });
    res.json(genres.map(serializeGenre));
  } catch (error) {
    next(error);
  }
});

app.post("/api/genres", requireAdmin, async (req, res, next) => {
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

app.put("/api/genres/:id", requireAdmin, async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const name = req.body.name?.trim();
    if (!name) throw new HttpError(400, "Nome do gênero é obrigatório");

    const genre = await prisma.$transaction(async (tx) => {
      const current = await tx.genre.findUnique({ where: { id } });
      if (!current) throw new HttpError(404, "Gênero não encontrado");
      const updated = await tx.genre.update({ where: { id }, data: { name } });
      if (current.name !== name) {
        await replaceNameInGameArray("genres", current.name, name, tx);
      }
      return updated;
    });
    res.json(serializeGenre(genre));
  } catch (error) {
    if (error.code === "P2025") return next(new HttpError(404, "Gênero não encontrado"));
    if (error.code === "P2002") return next(new HttpError(409, "Já existe um gênero com esse nome"));
    next(error);
  }
});

app.delete("/api/genres/:id", requireAdmin, async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    await prisma.$transaction(async (tx) => {
      const current = await tx.genre.findUnique({ where: { id } });
      if (!current) throw new HttpError(404, "Gênero não encontrado");
      await tx.genre.delete({ where: { id } });
      await removeNameFromGameArray("genres", current.name, tx);
    });
    res.status(204).send();
  } catch (error) {
    if (error.code === "P2025") return next(new HttpError(404, "Gênero não encontrado"));
    next(error);
  }
});

// Platforms CRUD
app.get("/api/platforms", async (_req, res, next) => {
  try {
    await ensureLegacyTaxonomySynced();
    const platforms = await prisma.platform.findMany({ orderBy: { name: "asc" } });
    res.json(platforms.map(serializePlatform));
  } catch (error) {
    next(error);
  }
});

app.post("/api/platforms", requireAdmin, async (req, res, next) => {
  try {
    const name = req.body.name?.trim();
    if (!name) throw new HttpError(400, "Nome da plataforma é obrigatório");
    const platform = await prisma.platform.create({ data: { name } });
    res.status(201).json(serializePlatform(platform));
  } catch (error) {
    if (error.code === "P2002") return next(new HttpError(409, "Já existe uma plataforma com esse nome"));
    next(error);
  }
});

app.put("/api/platforms/:id", requireAdmin, async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const name = req.body.name?.trim();
    if (!name) throw new HttpError(400, "Nome da plataforma é obrigatório");
    const platform = await prisma.$transaction(async (tx) => {
      const current = await tx.platform.findUnique({ where: { id } });
      if (!current) throw new HttpError(404, "Plataforma não encontrada");
      const updated = await tx.platform.update({ where: { id }, data: { name } });
      if (current.name !== name) {
        await replaceNameInGameArray("platforms", current.name, name, tx);
      }
      return updated;
    });
    res.json(serializePlatform(platform));
  } catch (error) {
    if (error.code === "P2025") return next(new HttpError(404, "Plataforma não encontrada"));
    if (error.code === "P2002") return next(new HttpError(409, "Já existe uma plataforma com esse nome"));
    next(error);
  }
});

app.delete("/api/platforms/:id", requireAdmin, async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    await prisma.$transaction(async (tx) => {
      const current = await tx.platform.findUnique({ where: { id } });
      if (!current) throw new HttpError(404, "Plataforma não encontrada");
      await tx.platform.delete({ where: { id } });
      await removeNameFromGameArray("platforms", current.name, tx);
    });
    res.status(204).send();
  } catch (error) {
    if (error.code === "P2025") return next(new HttpError(404, "Plataforma não encontrada"));
    next(error);
  }
});

// Promotions CRUD
app.get("/api/promotions", async (_req, res, next) => {
  try {
    const promotions = await prisma.promotion.findMany({
      include: { game: { include: GAME_INCLUDE } },
      orderBy: { createdAt: "desc" }
    });
    res.json(promotions.map(serializePromotion));
  } catch (error) {
    next(error);
  }
});

app.post("/api/promotions", requireAdmin, async (req, res, next) => {
  try {
    const data = validatePromotionInput(req.body);
    const game = await prisma.game.findUnique({ where: { id: data.gameId } });
    if (!game || !game.isActive) throw new HttpError(404, "Jogo da promoção não encontrado");
    const promotion = await prisma.promotion.create({ data, include: { game: { include: GAME_INCLUDE } } });
    res.status(201).json(serializePromotion(promotion));
  } catch (error) {
    next(error);
  }
});

app.put("/api/promotions/:id", requireAdmin, async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const data = validatePromotionInput(req.body);
    if (req.body.isActive !== undefined) data.isActive = Boolean(req.body.isActive);
    const promotion = await prisma.promotion.update({ where: { id }, data, include: { game: { include: GAME_INCLUDE } } });
    res.json(serializePromotion(promotion));
  } catch (error) {
    if (error.code === "P2025") return next(new HttpError(404, "Promoção não encontrada"));
    next(error);
  }
});

app.delete("/api/promotions/:id", requireAdmin, async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    await prisma.promotion.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    if (error.code === "P2025") return next(new HttpError(404, "Promoção não encontrada"));
    next(error);
  }
});

// RAWG integration
app.get("/api/rawg/search", requireAdmin, async (req, res, next) => {
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

app.post("/api/rawg/import/:rawgId", requireAdmin, async (req, res, next) => {
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

    const mapped = mapRawgGame(response.data, price);
    const game = await prisma.$transaction(async (tx) => {
      const created = await tx.game.create({ data: mapped });
      await syncGameTaxonomy(created.id, { genres: mapped.genres, platforms: mapped.platforms }, tx);
      return findGameForResponse(created.id, tx);
    });
    res.status(201).json(serializeGame(game));
  } catch (error) {
    if (error.response) return next(new HttpError(502, "Erro ao importar jogo da RAWG API"));
    next(error);
  }
});

// Cart and checkout
app.get("/api/cart", async (req, res, next) => {
  try {
    const owner = await getCartOwner(req);
    res.json(await getCartPayload(owner));
  } catch (error) {
    next(error);
  }
});

app.post("/api/cart/items", async (req, res, next) => {
  try {
    const gameId = parseId(req.body.gameId);
    const owner = await getCartOwner(req);
    const [game, existingCartItem, existingLibraryItem] = await Promise.all([
      prisma.game.findUnique({ where: { id: gameId } }),
      prisma.cartItem.findUnique({ where: cartItemUniqueWhere(owner, gameId) }),
      owner.userId
        ? prisma.libraryItem.findFirst({ where: { gameId, userId: owner.userId } })
        : Promise.resolve(null)
    ]);

    assertCanAddToCart({ game, existingCartItem, existingLibraryItem });

    const item = await prisma.cartItem.create({
      data: { userId: owner.userId, sessionId: owner.sessionId, gameId, priceAtMoment: game.price },
      include: { game: true }
    });

    res.status(201).json(serializeCartItem(item));
  } catch (error) {
    if (error.code === "P2002") return next(new HttpError(409, "Este jogo já está no carrinho"));
    next(error);
  }
});

app.delete("/api/cart/items/:id", async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const owner = await getCartOwner(req);
    const deleted = await prisma.cartItem.deleteMany({ where: { id, ...cartOwnerWhere(owner) } });
    if (deleted.count === 0) throw new HttpError(404, "Item não encontrado no carrinho");
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

app.delete("/api/cart", async (req, res, next) => {
  try {
    const owner = await getCartOwner(req);
    await prisma.cartItem.deleteMany({ where: cartOwnerWhere(owner) });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

app.post("/api/cart/merge-guest", requireAuth, async (req, res, next) => {
  try {
    const sessionId = getGuestCartId(req);
    const guestItems = await prisma.cartItem.findMany({
      where: { sessionId },
      include: { game: true }
    });

    let merged = 0;
    let skipped = 0;

    for (const item of guestItems) {
      const [existingCartItem, existingLibraryItem] = await Promise.all([
        prisma.cartItem.findUnique({ where: { userId_gameId: { userId: req.user.id, gameId: item.gameId } } }),
        prisma.libraryItem.findFirst({ where: { userId: req.user.id, gameId: item.gameId } })
      ]);

      if (existingCartItem || existingLibraryItem || !item.game?.isActive) {
        skipped += 1;
        continue;
      }

      await prisma.cartItem.create({
        data: {
          userId: req.user.id,
          sessionId: null,
          gameId: item.gameId,
          priceAtMoment: item.priceAtMoment
        }
      });
      merged += 1;
    }

    await prisma.cartItem.deleteMany({ where: { sessionId } });
    const payload = await getCartPayload({ user: req.user, userId: req.user.id, sessionId: null });
    res.json({ merged, skipped, ...payload });
  } catch (error) {
    next(error);
  }
});

app.post("/api/orders/checkout", requireAuth, async (req, res, next) => {
  try {
    const owner = { user: req.user, userId: req.user.id, sessionId: null };
    const cartItems = await getCartItems(owner);
    if (cartItems.length === 0) throw new HttpError(400, "Carrinho vazio");

    const total = calculateCartTotal(cartItems);

    const order = await prisma.$transaction(async (tx) => {
      const createdOrder = await tx.order.create({
        data: {
          userId: req.user.id,
          total,
          status: "PAID",
          items: {
            create: cartItems.map((item) => ({
              gameId: item.gameId,
              priceAtPurchase: item.priceAtMoment
            }))
          }
        },
        include: { user: true, items: { include: { game: { include: GAME_INCLUDE } } } }
      });

      for (const item of cartItems) {
        await tx.libraryItem.upsert({
          where: { userId_gameId: { userId: req.user.id, gameId: item.gameId } },
          update: {},
          create: { userId: req.user.id, gameId: item.gameId }
        });
      }

      await tx.cartItem.deleteMany({ where: { userId: req.user.id } });
      return createdOrder;
    });

    res.status(201).json(serializeOrder(order));
  } catch (error) {
    next(error);
  }
});

app.get("/api/library", requireAuth, async (req, res, next) => {
  try {
    const libraryItems = await prisma.libraryItem.findMany({
      where: { userId: req.user.id },
      include: { game: { include: GAME_INCLUDE } },
      orderBy: { purchasedAt: "desc" }
    });
    res.json(libraryItems.map(serializeLibraryItem));
  } catch (error) {
    next(error);
  }
});

app.get("/api/orders", requireAuth, async (req, res, next) => {
  try {
    const orders = await prisma.order.findMany({
      where: req.user.role === "ADMIN" ? {} : { userId: req.user.id },
      include: { user: true, items: { include: { game: { include: GAME_INCLUDE } } } },
      orderBy: { createdAt: "desc" }
    });
    res.json(orders.map(serializeOrder));
  } catch (error) {
    next(error);
  }
});

app.patch("/api/orders/:id/status", requireAdmin, async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const status = req.body.status;
    if (!["PENDING", "PAID", "CANCELED"].includes(status)) throw new HttpError(400, "Status inválido");
    const order = await prisma.order.update({
      where: { id },
      data: { status },
      include: { user: true, items: { include: { game: { include: GAME_INCLUDE } } } }
    });
    res.json(serializeOrder(order));
  } catch (error) {
    if (error.code === "P2025") return next(new HttpError(404, "Pedido não encontrado"));
    next(error);
  }
});

// Wishlist
app.get("/api/wishlist", requireAuth, async (req, res, next) => {
  try {
    const items = await prisma.wishlistItem.findMany({
      where: { userId: req.user.id },
      include: { game: { include: GAME_INCLUDE } },
      orderBy: { createdAt: "desc" }
    });
    res.json(items.map(serializeWishlistItem));
  } catch (error) {
    next(error);
  }
});

app.post("/api/wishlist/:gameId", requireAuth, async (req, res, next) => {
  try {
    const gameId = parseId(req.params.gameId);
    const [game, libraryItem] = await Promise.all([
      prisma.game.findUnique({ where: { id: gameId } }),
      prisma.libraryItem.findFirst({ where: { userId: req.user.id, gameId } })
    ]);

    if (!game || !game.isActive) throw new HttpError(404, "Jogo não encontrado");
    if (libraryItem) throw new HttpError(409, "Este jogo já está na biblioteca");

    const item = await prisma.wishlistItem.upsert({
      where: { userId_gameId: { userId: req.user.id, gameId } },
      update: {},
      create: { userId: req.user.id, gameId },
      include: { game: { include: GAME_INCLUDE } }
    });
    res.status(201).json(serializeWishlistItem(item));
  } catch (error) {
    next(error);
  }
});

app.delete("/api/wishlist/:gameId", requireAuth, async (req, res, next) => {
  try {
    const gameId = parseId(req.params.gameId);
    const deleted = await prisma.wishlistItem.deleteMany({ where: { userId: req.user.id, gameId } });
    if (deleted.count === 0) throw new HttpError(404, "Jogo não encontrado na lista de desejos");
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  if (process.env.NODE_ENV !== "test") {
    console.error(error);
  }
  const status = error.status || 500;
  const message = error.message || "Erro interno no servidor";
  res.status(status).json({ message });
});
