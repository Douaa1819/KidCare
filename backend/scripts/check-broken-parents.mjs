import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();
const broken = await p.utilisateur.findMany({
  where: { role: "PARENT", tuteurId: null },
  select: { id: true, email: true, statut: true, creeLe: true },
});
console.log("Parents without tuteurId:", broken);

const tuteursNoUser = await p.tuteur.findMany({
  where: { email: { not: null }, utilisateur: null },
  take: 10,
  select: {
    id: true,
    email: true,
    familleId: true,
    famille: { select: { _count: { select: { enfants: true } } } },
  },
});
console.log("Tuteurs without utilisateur:", tuteursNoUser);
await p.$disconnect();
