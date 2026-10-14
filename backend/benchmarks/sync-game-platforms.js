import dotenv from "dotenv";
import { performance } from "node:perf_hooks";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

dotenv.config();

const { PrismaClient } = await import("@prisma/client");
const { syncGamePlatforms } = await import("../src/app.js");

const sizes = (process.env.BENCH_SIZES || "10,50,100,250,500")
  .split(",")
  .map(Number)
  .filter((value) => Number.isInteger(value) && value > 0);

const repetitions = Number(process.env.BENCH_REPETITIONS || 5);
const label = process.env.BENCH_LABEL || "before";

if (sizes.length === 0) {
  throw new Error("Nenhum tamanho válido informado em BENCH_SIZES");
}

if (!Number.isInteger(repetitions) || repetitions <= 0) {
  throw new Error("BENCH_REPETITIONS deve ser um inteiro positivo");
}

const db = new PrismaClient({
  log: [{ emit: "event", level: "query" }]
});

const runId = `${Date.now()}_${process.pid}`;
const platformPrefix = `__bench_platform_${runId}_`;

let measuring = false;
let queryCount = 0;
let benchmarkGame = null;

db.$on("query", () => {
  if (measuring) {
    queryCount += 1;
  }
});

function createPlatformNames(n) {
  return Array.from(
    { length: n },
    (_, index) => `${platformPrefix}${index}`
  );
}

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

async function resetBenchmarkData() {
  if (!benchmarkGame) {
    return;
  }

  await db.gamePlatform.deleteMany({
    where: { gameId: benchmarkGame.id }
  });

  await db.platform.deleteMany({
    where: {
      name: {
        startsWith: platformPrefix
      }
    }
  });

  await db.game.update({
    where: { id: benchmarkGame.id },
    data: { platforms: [] }
  });
}

async function runOnce(n) {
  await resetBenchmarkData();

  const names = createPlatformNames(n);

  queryCount = 0;
  measuring = true;

  let result;
  let elapsed;

  try {
    const start = performance.now();
    result = await syncGamePlatforms(benchmarkGame.id, names, db);
    elapsed = performance.now() - start;
  } finally {
    measuring = false;
  }

  if (result.length !== n) {
    throw new Error(
      `Resultado inválido para n=${n}: esperado ${n}, recebido ${result.length}`
    );
  }

  return {
    timeMs: elapsed,
    queries: queryCount
  };
}

async function warmUp() {
  await resetBenchmarkData();
  await syncGamePlatforms(
    benchmarkGame.id,
    createPlatformNames(3),
    db
  );
  await resetBenchmarkData();
}

async function main() {
  benchmarkGame = await db.game.create({
    data: {
      title: `Benchmark syncGamePlatforms ${runId}`,
      description: "Benchmark",
      price: 1,
      genres: [],
      platforms: [],
      isActive: false
    }
  });

  await warmUp();

  const results = [];

  for (const n of sizes) {
    const times = [];
    const queries = [];

    for (let repetition = 1; repetition <= repetitions; repetition += 1) {
      const result = await runOnce(n);

      times.push(result.timeMs);
      queries.push(result.queries);

      console.log(
        `[${label}] n=${n} execução=${repetition}/${repetitions} ` +
        `tempo=${result.timeMs.toFixed(3)}ms queries=${result.queries}`
      );
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

  const safeLabel = label.replace(/[^a-zA-Z0-9_-]/g, "-");
  const outputPath = join(
    resultsDirectory,
    `sync-game-platforms-${safeLabel}.csv`
  );

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
    await resetBenchmarkData();

    if (benchmarkGame) {
      await db.game.delete({
        where: { id: benchmarkGame.id }
      });
    }

    await db.platform.deleteMany({
      where: {
        name: {
          startsWith: platformPrefix
        }
      }
    });
  } finally {
    await db.$disconnect();
  }
}
