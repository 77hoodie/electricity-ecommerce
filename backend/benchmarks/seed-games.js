import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { performance } from "node:perf_hooks";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { seedGames } from "../prisma/seedGames.js";
import { seedGamesOriginal } from "./seed-games-original.js";

const label = process.env.BENCH_LABEL || "before";
const sizes = (process.env.BENCH_SIZES || "10,50,100,250,500,1000")
  .split(",")
  .map((item) => Number(item.trim()));
const repetitions = Number(process.env.BENCH_REPETITIONS || 5);
const implementation = label === "before" ? seedGamesOriginal : seedGames;

if (!["before", "after"].includes(label)) {
  throw new Error("BENCH_LABEL deve ser before ou after");
}

const genresPerGame = 3;
const platformsPerGame = 2;
const genrePoolSize = 20;
const platformPoolSize = 8;

if (sizes.length === 0 || sizes.some((n) => !Number.isSafeInteger(n) || n <= 0)) {
  throw new Error("BENCH_SIZES deve conter inteiros positivos separados por vírgula");
}

if (!Number.isSafeInteger(repetitions) || repetitions <= 0) {
  throw new Error("BENCH_REPETITIONS deve ser um inteiro positivo");
}

const db = new PrismaClient({
  log: [{ emit: "event", level: "query" }]
});

const runId = randomUUID();
const titlePrefix = `__bench_seed_${runId}_`;
const genrePrefix = `__bench_seed_genre_${runId}_`;
const platformPrefix = `__bench_seed_platform_${runId}_`;

let measuring = false;
let queryCount = 0;

db.$on("query", () => {
  if (measuring) queryCount += 1;
});

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }

  return sorted[middle];
}

function mean(values) {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function createGames(n) {
  return Array.from({ length: n }, (_, index) => ({
    title: `${titlePrefix}${index}`,
    description: "Benchmark",
    price: 1,
    coverUrl: `https://example.com/${index}.jpg`,
    rating: 4,
    genres: Array.from(
      { length: genresPerGame },
      (_, offset) => `${genrePrefix}${(index + offset) % genrePoolSize}`
    ),
    platforms: Array.from(
      { length: platformsPerGame },
      (_, offset) => `${platformPrefix}${(index + offset) % platformPoolSize}`
    ),
    releaseDate: new Date("2020-01-01")
  }));
}

async function removeAll() {
  await db.game.deleteMany({
    where: { title: { startsWith: titlePrefix } }
  });
  await db.genre.deleteMany({
    where: { name: { startsWith: genrePrefix } }
  });
  await db.platform.deleteMany({
    where: { name: { startsWith: platformPrefix } }
  });
}

async function verify(n) {
  const where = { game: { title: { startsWith: titlePrefix } } };
  const games = await db.game.count({ where: { title: { startsWith: titlePrefix } } });
  const genreLinks = await db.gameGenre.count({ where });
  const platformLinks = await db.gamePlatform.count({ where });

  if (games !== n) {
    throw new Error(`Jogos inválidos para n=${n}: esperado ${n}, recebido ${games}`);
  }

  if (genreLinks !== n * genresPerGame) {
    throw new Error(
      `Vínculos de gênero inválidos para n=${n}: esperado ${n * genresPerGame}, recebido ${genreLinks}`
    );
  }

  if (platformLinks !== n * platformsPerGame) {
    throw new Error(
      `Vínculos de plataforma inválidos para n=${n}: esperado ${n * platformsPerGame}, recebido ${platformLinks}`
    );
  }
}

async function runOnce(n, games) {
  await removeAll();

  queryCount = 0;
  measuring = true;

  let elapsed;

  try {
    const start = performance.now();
    await implementation(games, db);
    elapsed = performance.now() - start;
  } finally {
    measuring = false;
  }

  await verify(n);

  return {
    timeMs: elapsed,
    queries: queryCount
  };
}

async function warmUp() {
  await implementation(createGames(3), db);
  await removeAll();
}

async function main() {
  await warmUp();

  const results = [];

  for (const n of sizes) {
    const games = createGames(n);
    const times = [];
    const queries = [];

    try {
      for (let repetition = 1; repetition <= repetitions; repetition += 1) {
        const result = await runOnce(n, games);

        times.push(result.timeMs);
        queries.push(result.queries);

        console.log(
          `[${label}] n=${n} execução=${repetition}/${repetitions} ` +
          `tempo=${result.timeMs.toFixed(3)}ms queries=${result.queries}`
        );
      }
    } finally {
      await removeAll();
    }

    results.push({
      label,
      n,
      repetitions,
      medianMs: median(times),
      meanMs: mean(times),
      minMs: Math.min(...times),
      maxMs: Math.max(...times),
      medianQueries: median(queries)
    });
  }

  console.table(
    results.map((result) => ({
      versão: result.label,
      n: result.n,
      execuções: result.repetitions,
      "mediana (ms)": result.medianMs.toFixed(3),
      "média (ms)": result.meanMs.toFixed(3),
      "mínimo (ms)": result.minMs.toFixed(3),
      "máximo (ms)": result.maxMs.toFixed(3),
      "queries (mediana)": result.medianQueries
    }))
  );

  const directory = dirname(fileURLToPath(import.meta.url));
  const resultsDirectory = join(directory, "results");

  await mkdir(resultsDirectory, { recursive: true });

  const outputPath = join(resultsDirectory, `seed-games-${label}.csv`);

  const csv = [
    "label,n,repetitions,medianMs,meanMs,minMs,maxMs,medianQueries",
    ...results.map((result) =>
      [
        result.label,
        result.n,
        result.repetitions,
        result.medianMs.toFixed(6),
        result.meanMs.toFixed(6),
        result.minMs.toFixed(6),
        result.maxMs.toFixed(6),
        result.medianQueries
      ].join(",")
    )
  ].join("\n");

  await writeFile(outputPath, `${csv}\n`, "utf8");

  console.log(`\nResultado salvo em: ${outputPath}`);
}

try {
  await main();
} finally {
  try {
    await removeAll();
  } finally {
    await db.$disconnect();
  }
}
