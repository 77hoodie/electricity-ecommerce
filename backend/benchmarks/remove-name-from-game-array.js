import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { performance } from "node:perf_hooks";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { removeNameFromGameArray } from "../src/app.js";

const label = process.env.BENCH_LABEL || "before";
const sizes = (process.env.BENCH_SIZES || "10,50,100,500,1000")
  .split(",")
  .map((item) => Number(item.trim()));
const repetitions = Number(process.env.BENCH_REPETITIONS || 5);

if (!["before", "after"].includes(label)) {
  throw new Error("BENCH_LABEL deve ser before ou after");
}

if (sizes.length === 0 || sizes.some((n) => !Number.isSafeInteger(n) || n <= 0)) {
  throw new Error("BENCH_SIZES deve conter inteiros positivos separados por vírgula");
}

if (!Number.isSafeInteger(repetitions) || repetitions <= 0) {
  throw new Error("BENCH_REPETITIONS deve ser um inteiro positivo");
}

const prisma = new PrismaClient({
  log: [{ emit: "event", level: "query" }]
});

const runId = randomUUID();
const name = `__benchmark_remove_${runId}`;
let measuring = false;
let queryCount = 0;

prisma.$on("query", () => {
  if (measuring) queryCount += 1;
});

async function originalRemoveNameFromGameArray(field, value, db = prisma) {
  const games = await db.game.findMany({ where: { [field]: { has: value } } });
  for (const game of games) {
    const values = (game[field] || []).filter((item) => item !== value);
    await db.game.update({ where: { id: game.id }, data: { [field]: values } });
  }
}

function median(values) {
  const ordered = [...values].sort((a, b) => a - b);
  const half = Math.floor(ordered.length / 2);
  return ordered.length % 2
    ? ordered[half]
    : (ordered[half - 1] + ordered[half]) / 2;
}

function mean(values) {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

async function runOnce(n, prefix) {
  await prisma.game.updateMany({
    where: { title: { startsWith: prefix } },
    data: { genres: [name] }
  });

  const ready = await prisma.game.count({
    where: { title: { startsWith: prefix }, genres: { has: name } }
  });

  if (ready !== n) {
    throw new Error(`Preparação inválida: esperado ${n} jogos, encontrados ${ready}`);
  }

  queryCount = 0;
  let duration;
  let sqlQueries;
  measuring = true;

  try {
    const start = performance.now();
    if (label === "before") {
      await originalRemoveNameFromGameArray("genres", name, prisma);
    } else {
      await removeNameFromGameArray("genres", name, prisma);
    }
    duration = performance.now() - start;
    sqlQueries = queryCount;
  } finally {
    measuring = false;
  }

  const remaining = await prisma.game.count({
    where: { title: { startsWith: prefix }, genres: { has: name } }
  });

  if (remaining !== 0) {
    throw new Error(`Remoção incompleta para n=${n}: ${remaining} jogos ainda contêm o gênero`);
  }

  return { duration, sqlQueries };
}

async function main() {
  const results = [];

  for (const n of sizes) {
    const prefix = `__benchmark_game_${runId}_${n}_`;

    try {
      await prisma.game.createMany({
        data: Array.from({ length: n }, (_, index) => ({
          title: `${prefix}${index}`,
          description: "Jogo de teste do benchmark",
          price: 10,
          genres: [name],
          platforms: [],
          isActive: false
        }))
      });

      const times = [];
      const queries = [];

      for (let attempt = 1; attempt <= repetitions; attempt += 1) {
        const { duration, sqlQueries } = await runOnce(n, prefix);
        times.push(duration);
        queries.push(sqlQueries);
        console.log(
          `[${label}] n=${n} execução=${attempt}/${repetitions} ` +
          `tempo=${duration.toFixed(3)}ms queries=${sqlQueries}`
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
    } finally {
      await prisma.game.deleteMany({
        where: { title: { startsWith: prefix } }
      });
    }
  }

  console.table(results.map((item) => ({
    versão: item.label,
    n: item.n,
    execuções: item.repetitions,
    "mediana (ms)": item.medianMs.toFixed(3),
    "média (ms)": item.meanMs.toFixed(3),
    "consultas (mediana)": item.medianQueries
  })));

  const directory = dirname(fileURLToPath(import.meta.url));
  const resultsDir = join(directory, "results");
  await mkdir(resultsDir, { recursive: true });
  const output = join(resultsDir, `remove-name-${label}.csv`);

  const columns = [
    "label", "n", "repetitions", "medianMs", "meanMs",
    "minMs", "maxMs", "medianQueries"
  ];
  const rows = results.map((item) => columns.map((column) =>
    typeof item[column] === "number"
      ? Number.isInteger(item[column]) ? item[column] : item[column].toFixed(6)
      : item[column]
  ).join(","));

  await writeFile(output, `${columns.join(",")}\n${rows.join("\n")}\n`, "utf8");
  console.log(`\nResultado salvo em: ${output}`);
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
