import { PrismaClient } from "@prisma/client";
import { createHash } from "node:crypto";
import { seedGames } from "./seedGames.js";

const prisma = new PrismaClient();

function hashPassword(password) {
  return createHash("sha256").update(password).digest("hex");
}

async function main() {
  await prisma.user.upsert({
    where: { email: "admin@electricity.com" },
    update: { role: "ADMIN" },
    create: {
      name: "Administrador",
      email: "admin@electricity.com",
      passwordHash: hashPassword("admin123"),
      role: "ADMIN"
    }
  });

  await prisma.user.upsert({
    where: { email: "user@electricity.com" },
    update: { role: "USER" },
    create: {
      name: "Usuário Teste",
      email: "user@electricity.com",
      passwordHash: hashPassword("user123"),
      role: "USER"
    }
  });

  await prisma.genre.createMany({
    data: [
      { name: "Ação" },
      { name: "Aventura" },
      { name: "Indie" },
      { name: "RPG" },
      { name: "Estratégia" },
      { name: "Plataforma" },
      { name: "Simulação" }
    ],
    skipDuplicates: true
  });

  await prisma.platform.createMany({
    data: [
      { name: "PC" },
      { name: "PlayStation" },
      { name: "Xbox" },
      { name: "Nintendo Switch" },
      { name: "Linux" }
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
    },
    {
      title: "Stardew Valley",
      description: "Simulador de fazenda com exploração, comunidade, progressão e gerenciamento de recursos.",
      price: 24.99,
      coverUrl: "https://media.rawg.io/media/games/fd9/fd92f105dcd6491bc5d61135033d1f19.jpg",
      rating: 4.4,
      genres: ["RPG", "Simulação", "Indie"],
      platforms: ["PC", "Nintendo Switch", "PlayStation", "Xbox"],
      releaseDate: new Date("2016-02-26")
    }
  ];

  await seedGames(games, prisma);

  const hollowKnight = await prisma.game.findFirst({ where: { title: "Hollow Knight" } });
  if (hollowKnight) {
    const existingPromotion = await prisma.promotion.findFirst({ where: { gameId: hollowKnight.id } });
    if (!existingPromotion) {
      await prisma.promotion.create({
        data: {
          gameId: hollowKnight.id,
          discountPercentage: 20,
          startDate: new Date("2026-01-01"),
          endDate: new Date("2026-12-31"),
          isActive: true
        }
      });
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log("Seed concluído.");
    console.log("Admin: admin@electricity.com / admin123");
    console.log("Usuário: user@electricity.com / user123");
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
