import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { performance } from "node:perf_hooks";
import { writeFile, mkdir } from "node:fs/promises";
import { removeNameFromGameArray } from "../../src/app.js";

const prisma = new PrismaClient();
const versao = process.env.BENCH_LABEL || "before";
const nome = `__benchmark_${Date.now()}`;
const resultados = [];
const repeticoes = 5;

async function antiga(campo, valor) {
  const jogos = await prisma.game.findMany({
    where: { [campo]: { has: valor } },
    select: { id: true, [campo]: true },
  });

  for (const jogo of jogos) {
    await prisma.game.update({
      where: { id: jogo.id },
      data: {
        [campo]: jogo[campo].filter((item) => item !== valor),
      },
    });
  }
}

async function main() {
  for (const quantidade of [10, 50, 100, 500, 1000]) {
    const prefixo = `bench_${Date.now()}_${quantidade}_`;

    try {
      await prisma.game.createMany({
        data: Array.from({ length: quantidade }, (_, i) => ({
          title: `${prefixo}${i}`,
          description: "Jogo de teste do benchmark",
          price: 10,
          genres: [nome],
          platforms: [],
        })),
      });

      const tempos = [];

      for (let i = 0; i < repeticoes; i++) {
        await prisma.game.updateMany({
          where: { title: { startsWith: prefixo } },
          data: { genres: [nome] },
        });

        const inicio = performance.now();

        if (versao === "before") {
          await antiga("genres", nome);
        } else {
          await removeNameFromGameArray("genres", nome, prisma);
        }

        tempos.push(performance.now() - inicio);
      }

      const ordenados = [...tempos].sort((a, b) => a - b);
      const media = tempos.reduce((a, b) => a + b, 0) / tempos.length;

      resultados.push({
        label: versao,
        n: quantidade,
        repetitions: repeticoes,
        medianMs: Number(ordenados[Math.floor(ordenados.length / 2)].toFixed(2)),
        meanMs: Number(media.toFixed(2)),
        minMs: Number(Math.min(...tempos).toFixed(2)),
        maxMs: Number(Math.max(...tempos).toFixed(2)),
        medianQueries: "",
      });

      console.log(`${versao} | n=${quantidade} | mediana=${ordenados[Math.floor(ordenados.length / 2)].toFixed(2)} ms`);
    } finally {
      await prisma.game.deleteMany({
        where: { title: { startsWith: prefixo } },
      });
    }
  }

  await mkdir("benchmarks/results", { recursive: true });

  const colunas = [
    "label",
    "n",
    "repetitions",
    "medianMs",
    "meanMs",
    "minMs",
    "maxMs",
    "medianQueries",
  ];

  const csv = [
    colunas.join(","),
    ...resultados.map((r) =>
      colunas.map((coluna) => r[coluna] ?? "").join(",")
    ),
  ].join("\n");

  await writeFile(
    `benchmarks/results/remove-name-${versao}.csv`,
    csv
  );

  console.log(`Resultados salvos em benchmarks/results/remove-name-${versao}.csv`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
