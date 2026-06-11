import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const enfants = await prisma.enfant.findMany({
    select: {
      id: true,
      prenom: true,
      nom: true,
      archivedAt: true,
      classeId: true,
      classe: { select: { nom: true } },
    },
  });
  console.log('Enfants en base:', enfants.length);
  console.log(JSON.stringify(enfants, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
