import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.genre.createMany({
    data: [
      { name: "Ação" },
      { name: "Aventura" },
      { name: "Indie" },
      { name: "RPG" },
      { name: "Estratégia" }
    ],
    skipDuplicates: true
  });

  const games = [
    {
      title: "Hollow Knight",
      description: "Aventura de ação em mundo subterrâneo com exploração, combate e atmosfera sombria.",
      price: 46.99,
      coverUrl: "https://media.rawg.io/media/games/4cf/4cfc6b7f1850590a4634b08bfab308ab.jpg",
      rating: 4.4,
      genres: ["Ação", "Aventura", "Indie"],
      platforms: ["PC", "Nintendo Switch", "PlayStation", "Xbox"],
      releaseDate: new Date("2017-02-24")
    },
    {
      title: "Celeste",
      description: "Jogo de plataforma desafiador sobre escalar uma montanha e superar limites.",
      price: 36.99,
      coverUrl: "https://media.rawg.io/media/games/23b/23b42b7a896140f4ce1d0df8c42fa012.jpg",
      rating: 4.3,
      genres: ["Plataforma", "Indie"],
      platforms: ["PC", "Nintendo Switch", "PlayStation", "Xbox"],
      releaseDate: new Date("2018-01-25")
    }
  ];

  for (const game of games) {
    const exists = await prisma.game.findFirst({ where: { title: game.title } });
    if (!exists) {
      await prisma.game.create({ data: game });
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log("Seed concluído.");
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
