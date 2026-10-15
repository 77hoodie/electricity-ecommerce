import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { performance } from "node:perf_hooks";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const label = process.env.BENCH_LABEL || "before";
const sizes = (process.env.BENCH_SIZES || "10,50,100,250,500")
  .split(",")
  .map((value) => Number(value.trim()));
const repetitions = Number(process.env.BENCH_REPETITIONS || 5);
const existingRatio = Number(process.env.BENCH_EXISTING_RATIO ?? 0.25);

if (!["before", "after"].includes(label)) {
  throw new Error("BENCH_LABEL deve ser before ou after");
}
if (sizes.length === 0 || sizes.some((n) => !Number.isSafeInteger(n) || n <= 0)) {
  throw new Error("BENCH_SIZES deve conter inteiros positivos separados por vírgula");
}
if (!Number.isSafeInteger(repetitions) || repetitions <= 0) {
  throw new Error("BENCH_REPETITIONS deve ser um inteiro positivo");
}
if (!Number.isFinite(existingRatio) || existingRatio < 0 || existingRatio > 1) {
  throw new Error("BENCH_EXISTING_RATIO deve estar entre 0 e 1");
}

const prisma = new PrismaClient({
  log: [{ emit: "event", level: "query" }]
});
const runId = randomUUID();
let measuring = false;
let queryCount = 0;
let benchmarkUser = null;

prisma.$on("query", () => {
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

async function originalLibraryStep(cartItems, userId, tx) {
  for (const item of cartItems) {
    await tx.libraryItem.upsert({
      where: { userId_gameId: { userId, gameId: item.gameId } },
      update: {},
      create: { userId, gameId: item.gameId }
    });
  }
}

async function optimizedLibraryStep(cartItems, userId, tx) {
  const libraryData = cartItems.map((item) => ({
    userId,
    gameId: item.gameId
  }));

  if (libraryData.length > 0) {
    await tx.libraryItem.createMany({
      data: libraryData,
      skipDuplicates: true
    });
  }
}

async function runOnce(gameIds) {
  await prisma.libraryItem.deleteMany({
    where: { userId: benchmarkUser.id }
  });

  const existingCount = Math.floor(gameIds.length * existingRatio);
  if (existingCount > 0) {
    await prisma.libraryItem.createMany({
      data: gameIds.slice(0, existingCount).map((gameId) => ({
        userId: benchmarkUser.id,
        gameId
      }))
    });
  }

  const existing = existingCount > 0
    ? await prisma.libraryItem.findMany({
      where: { userId: benchmarkUser.id },
      select: { id: true, gameId: true, purchasedAt: true }
    })
    : [];
  const existingByGame = new Map(existing.map((item) => [item.gameId, item]));
  const cartItems = gameIds.map((gameId) => ({ gameId }));

  queryCount = 0;
  measuring = true;
  let elapsedMs;
  let queries;

  try {
    const start = performance.now();
    await prisma.$transaction(async (tx) => {
      if (label === "before") {
        await originalLibraryStep(cartItems, benchmarkUser.id, tx);
      } else {
        await optimizedLibraryStep(cartItems, benchmarkUser.id, tx);
      }
    });
    elapsedMs = performance.now() - start;
    queries = queryCount;
  } finally {
    measuring = false;
  }

  const library = await prisma.libraryItem.findMany({
    where: { userId: benchmarkUser.id },
    select: { id: true, gameId: true, purchasedAt: true }
  });
  if (library.length !== gameIds.length) {
    throw new Error(`Resultado inválido: esperado ${gameIds.length} jogos na biblioteca, encontrados ${library.length}`);
  }
  const resultIds = new Set(library.map((item) => item.gameId));
  if (gameIds.some((gameId) => !resultIds.has(gameId))) {
    throw new Error("Resultado inválido: faltam jogos na biblioteca");
  }
  for (const item of library) {
    const previous = existingByGame.get(item.gameId);
    if (previous && (previous.id !== item.id || previous.purchasedAt.getTime() !== item.purchasedAt.getTime())) {
      throw new Error("Resultado inválido: jogo existente foi modificado");
    }
  }

  return { elapsedMs, queries };
}

async function main() {
  benchmarkUser = await prisma.user.create({
    data: {
      name: `Benchmark checkout ${runId}`,
      email: `benchmark-checkout-${runId}@electricity.test`,
      passwordHash: "benchmark"
    }
  });

  const results = [];
  for (const n of sizes) {
    const prefix = `__benchmark_checkout_${runId}_${n}_`;
    try {
      await prisma.game.createMany({
        data: Array.from({ length: n }, (_, index) => ({
          title: `${prefix}${index}`,
          description: "Jogo de teste para a etapa da biblioteca no checkout",
          price: 10,
          genres: [],
          platforms: [],
          isActive: false
        }))
      });
      const games = await prisma.game.findMany({
        where: { title: { startsWith: prefix } },
        select: { id: true },
        orderBy: { id: "asc" }
      });
      if (games.length !== n) {
        throw new Error(`Preparação inválida: esperado ${n} jogos, encontrados ${games.length}`);
      }
      const gameIds = games.map((game) => game.id);

      await runOnce(gameIds.slice(0, Math.min(2, n)));
      const times = [];
      const queryCounts = [];
      for (let repetition = 1; repetition <= repetitions; repetition += 1) {
        const result = await runOnce(gameIds);
        times.push(result.elapsedMs);
        queryCounts.push(result.queries);
        console.log(
          `[${label}] n=${n} execução=${repetition}/${repetitions} ` +
          `tempo=${result.elapsedMs.toFixed(3)}ms queries=${result.queries}`
        );
      }

      results.push({
        label,
        n,
        repetitions,
        existingRatio,
        medianMs: median(times),
        meanMs: mean(times),
        minMs: Math.min(...times),
        maxMs: Math.max(...times),
        medianQueries: median(queryCounts)
      });
    } finally {
      await prisma.libraryItem.deleteMany({ where: { userId: benchmarkUser.id } });
      await prisma.game.deleteMany({ where: { title: { startsWith: prefix } } });
    }
  }

  console.table(results.map((item) => ({
    versão: item.label,
    n: item.n,
    execuções: item.repetitions,
    "mediana (ms)": item.medianMs.toFixed(3),
    "consultas (mediana)": item.medianQueries
  })));

  const directory = dirname(fileURLToPath(import.meta.url));
  const resultsDirectory = join(directory, "results");
  await mkdir(resultsDirectory, { recursive: true });
  const output = join(resultsDirectory, `checkout-biblioteca-${label}.csv`);
  const columns = [
    "label", "n", "repetitions", "existingRatio", "medianMs", "meanMs",
    "minMs", "maxMs", "medianQueries"
  ];
  const rows = results.map((item) => columns.map((column) =>
    typeof item[column] === "number" && !Number.isInteger(item[column])
      ? item[column].toFixed(6)
      : item[column]
  ).join(","));
  await writeFile(output, `${columns.join(",")}\n${rows.join("\n")}\n`, "utf8");
  console.log(`\nResultado salvo em: ${output}`);
}

try {
  await main();
} finally {
  try {
    if (benchmarkUser) {
      await prisma.libraryItem.deleteMany({ where: { userId: benchmarkUser.id } });
      await prisma.user.delete({ where: { id: benchmarkUser.id } });
    }
  } finally {
    await prisma.$disconnect();
  }
}
