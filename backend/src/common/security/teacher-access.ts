import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/** IDs des classes actuellement assignées à un utilisateur enseignant. */
export async function getEnseignantClasseIds(
  prisma: PrismaService,
  utilisateurId: string,
): Promise<string[]> {
  const utilisateur = await prisma.utilisateur.findUnique({
    where: { id: utilisateurId },
    include: {
      enseignant: {
        include: {
          classes: {
            where: { dateFin: null },
            select: { classeId: true },
          },
        },
      },
    },
  });

  if (utilisateur?.enseignant) {
    return utilisateur.enseignant.classes.map((ec) => ec.classeId);
  }

  const enseignant = await prisma.enseignant.findFirst({
    where: { utilisateur: { id: utilisateurId } },
    include: {
      classes: {
        where: { dateFin: null },
        select: { classeId: true },
      },
    },
  });

  return enseignant?.classes.map((ec) => ec.classeId) ?? [];
}

export async function assertTeacherCanAccessClasse(
  prisma: PrismaService,
  utilisateurId: string,
  classeId: string,
): Promise<void> {
  const classeIds = await getEnseignantClasseIds(prisma, utilisateurId);
  if (classeIds.length === 0) {
    throw new ForbiddenException(
      'Aucune classe assignée. Veuillez contacter l\'administrateur.',
    );
  }
  if (!classeIds.includes(classeId)) {
    throw new ForbiddenException('Vous n\'avez pas accès à cette classe');
  }
}

export async function assertTeacherCanAccessEnfant(
  prisma: PrismaService,
  utilisateurId: string,
  enfantId: string,
): Promise<void> {
  const enfant = await prisma.enfant.findFirst({
    where: { id: enfantId, archivedAt: null },
    select: { id: true, classeId: true },
  });

  if (!enfant) {
    throw new NotFoundException('Enfant non trouvé');
  }

  if (!enfant.classeId) {
    throw new ForbiddenException('Cet enfant n\'est assigné à aucune classe');
  }

  await assertTeacherCanAccessClasse(prisma, utilisateurId, enfant.classeId);
}
