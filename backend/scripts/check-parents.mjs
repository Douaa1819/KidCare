import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();
const parents = await p.utilisateur.findMany({
  where: { role: "PARENT" },
  take: 20,
  select: {
    id: true,
    email: true,
    tuteurId: true,
    statut: true,
    tuteur: { select: { id: true, familleId: true, famille: { select: { id: true, _count: { select: { enfants: true } } } } } },
  },
});
console.log(JSON.stringify(parents, null, 2));
console.log("Without tuteurId:", parents.filter((u) => !u.tuteurId).length);
await p.$disconnect();
