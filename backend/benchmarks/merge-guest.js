import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { performance } from "node:perf_hooks";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { mergeGuestCart } from "../src/app.js";

const label = process.env.BENCH_LABEL || "before";
const sizes = (process.env.BENCH_SIZES || "10,50,100,250,500")
  .split(",")
  .map((value) => Number(value.trim()));
const repetitions = Number(process.env.BENCH_REPETITIONS || 5);

if (process.env.NODE_ENV === "production") {
  throw new Error("Este benchmark não pode ser executado em produção");
}
if (!["before", "after"].includes(label)) {
  throw new Error("BENCH_LABEL deve ser before ou after");
}
if (sizes.length === 0 || sizes.some((n) => !Number.isSafeInteger(n) || n <= 0)) {
  throw new Error("BENCH_SIZES deve conter inteiros positivos separados por vírgula");
}
if (!Number.isSafeInteger(repetitions) || repetitions <= 0) {
  throw new Error("BENCH_REPETITIONS deve ser um inteiro positivo");
}

const db = new PrismaClient({ log: [{ emit: "event", level: "query" }] });
const runId = randomUUID();
const gamePrefix = `__benchmark_merge_${runId}_`;
const sessionId = `benchmark-guest-${runId}`;
let benchmarkUser = null;
let measuring = false;
let queryCount = 0;

db.$on("query", () => {
  if (measuring) queryCount += 1;
});

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

function mean(values) {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function classify(game, index) {
  if (index % 8 === 0) return "cart";
  if (index % 8 === 1) return "library";
  if (!game.isActive) return "inactive";
  return "merge";
}

async function prepareRun(games) {
  await db.cartItem.deleteMany({
    where: { OR: [{ userId: benchmarkUser.id }, { sessionId }] }
  });
  await db.libraryItem.deleteMany({ where: { userId: benchmarkUser.id } });

  const existingCart = [];
  const existingLibrary = [];
  const guestCart = [];
  const expectedPrices = new Map();
  let expectedMerged = 0;

  for (const [index, game] of games.entries()) {
    const category = classify(game, index);
    const snapshotPrice = 20 + (index % 13) + 0.25;
    guestCart.push({ sessionId, gameId: game.id, priceAtMoment: snapshotPrice });

    if (category === "cart") {
      existingCart.push({ userId: benchmarkUser.id, gameId: game.id, priceAtMoment: 99.99 });
      expectedPrices.set(game.id, 99.99);
    } else if (category === "library") {
      existingLibrary.push({ userId: benchmarkUser.id, gameId: game.id });
    } else if (category === "merge") {
      expectedPrices.set(game.id, snapshotPrice);
      expectedMerged += 1;
    }
  }

  if (existingCart.length > 0) await db.cartItem.createMany({ data: existingCart });
  if (existingLibrary.length > 0) await db.libraryItem.createMany({ data: existingLibrary });
  await db.cartItem.createMany({ data: guestCart });

  return { expectedMerged, expectedSkipped: games.length - expectedMerged, expectedPrices, existingLibrary };
}

async function runOnce(games) {
  const expected = await prepareRun(games);
  queryCount = 0;
  measuring = true;
  let elapsedMs;
  let queries;
  let result;

  try {
    const start = performance.now();
    result = await mergeGuestCart(benchmarkUser.id, sessionId, db);
    elapsedMs = performance.now() - start;
    queries = queryCount;
  } finally {
    measuring = false;
  }

  if (result.merged !== expected.expectedMerged || result.skipped !== expected.expectedSkipped) {
    throw new Error(`Contadores incorretos para n=${games.length}: ${JSON.stringify(result)}`);
  }

  const [userCart, guestCount, library] = await Promise.all([
    db.cartItem.findMany({ where: { userId: benchmarkUser.id }, select: { gameId: true, priceAtMoment: true } }),
    db.cartItem.count({ where: { sessionId } }),
    db.libraryItem.findMany({ where: { userId: benchmarkUser.id }, select: { gameId: true } })
  ]);

  if (guestCount !== 0 || userCart.length !== expected.expectedPrices.size) {
    throw new Error(`Carrinho inconsistente para n=${games.length}`);
  }
  for (const item of userCart) {
    if (Number(item.priceAtMoment) !== expected.expectedPrices.get(item.gameId)) {
      throw new Error(`Preço ou jogo incorreto: ${item.gameId}`);
    }
  }
  const expectedOwned = new Set(expected.existingLibrary.map((item) => item.gameId));
  if (library.length !== expectedOwned.size || library.some((item) => !expectedOwned.has(item.gameId))) {
    throw new Error("Biblioteca foi modificada indevidamente");
  }

  return { elapsedMs, queries, merged: result.merged, skipped: result.skipped };
}

async function main() {
  benchmarkUser = await db.user.create({
    data: {
      name: `Benchmark merge ${runId}`,
      email: `benchmark-merge-${runId}@electricity.test`,
      passwordHash: "benchmark"
    }
  });

  const results = [];

  for (const n of sizes) {
    const prefix = `${gamePrefix}${n}_`;
    try {
      await db.game.createMany({
        data: Array.from({ length: n }, (_, index) => ({
          title: `${prefix}${index}`,
          description: "Benchmark da mesclagem do carrinho",
          price: 50,
          genres: [],
          platforms: [],
          isActive: index % 8 !== 2
        }))
      });

      const found = await db.game.findMany({
        where: { title: { startsWith: prefix } },
        select: { id: true, title: true, isActive: true }
      });
      const byTitle = new Map(found.map((game) => [game.title, game]));
      const games = Array.from({ length: n }, (_, index) => byTitle.get(`${prefix}${index}`));
      if (games.some((game) => !game)) {
        throw new Error(`Preparação inválida para n=${n}`);
      }

      await runOnce(games.slice(0, Math.min(10, n)));
      const times = [];
      const queries = [];
      let merged = 0;
      let skipped = 0;
      for (let repetition = 1; repetition <= repetitions; repetition += 1) {
        const result = await runOnce(games);
        times.push(result.elapsedMs);
        queries.push(result.queries);
        merged = result.merged;
        skipped = result.skipped;
        console.log(
          `[${label}] n=${n} repetição=${repetition}/${repetitions} ` +
          `tempo=${result.elapsedMs.toFixed(3)}ms SQL=${result.queries} ` +
          `mesclados=${merged} ignorados=${skipped}`
        );
      }
      results.push({
        label, n, repetitions,
        medianMs: median(times),
        meanMs: mean(times),
        minMs: Math.min(...times),
        maxMs: Math.max(...times),
        medianQueries: median(queries),
        merged, skipped
      });
    } finally {
      await db.cartItem.deleteMany({
        where: { OR: [{ userId: benchmarkUser.id }, { sessionId }] }
      });
      await db.libraryItem.deleteMany({ where: { userId: benchmarkUser.id } });
      await db.game.deleteMany({ where: { title: { startsWith: prefix } } });
    }
  }

  console.table(results.map((result) => ({
    n: result.n,
    "mediana (ms)": result.medianMs.toFixed(3),
    "SQL (mediana)": result.medianQueries,
    mesclados: result.merged,
    ignorados: result.skipped
  })));

  const resultsDir = join(dirname(fileURLToPath(import.meta.url)), "results");
  await mkdir(resultsDir, { recursive: true });
  const columns = ["label", "n", "repetitions", "medianMs", "meanMs", "minMs", "maxMs", "medianQueries", "merged", "skipped"];
  const rows = results.map((result) => columns.map((key) =>
    typeof result[key] === "number" && !Number.isInteger(result[key])
      ? result[key].toFixed(6)
      : result[key]
  ).join(","));
  const output = join(resultsDir, `merge-guest-${label}.csv`);
  await writeFile(output, `${columns.join(",")}\n${rows.join("\n")}\n`, "utf8");
  console.log(`Resultado salvo em: ${output}`);
}

try {
  await main();
} finally {
  try {
    if (benchmarkUser) {
      await db.cartItem.deleteMany({
        where: { OR: [{ userId: benchmarkUser.id }, { sessionId }] }
      });
      await db.libraryItem.deleteMany({ where: { userId: benchmarkUser.id } });
      await db.game.deleteMany({ where: { title: { startsWith: gamePrefix } } });
      await db.user.delete({ where: { id: benchmarkUser.id } });
    }
  } finally {
    await db.$disconnect();
  }
}
