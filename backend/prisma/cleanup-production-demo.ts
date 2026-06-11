/**
 * Prépare la base Petitspas pour une démo production :
 * conserve 4 comptes, 2 enfants, classes/événements/menus/paramètres plateforme.
 *
 * Usage:
 *   pnpm run cleanup:demo:dry-run
 *   pnpm run cleanup:demo
 */
import {
  PrismaClient,
  RoleUtilisateur,
  LienTuteur,
  StatutUtilisateur,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const KEEP_USER_EMAILS = [
  'admin@wlw.ma',
  'sophie@wlw.ma',
  'enseignant.sophie@test.com',
  'sophie.parent@wlw.ma',
] as const;

const DEMO_PASSWORDS = {
  'admin@wlw.ma': process.env.ADMIN_PASSWORD ?? 'change_me',
  'sophie@wlw.ma': 'Sophie123!',
  'enseignant.sophie@test.com': 'Teacher123!',
  'sophie.parent@wlw.ma': 'SophieParent123!',
} as const;

const TARGET_CLASS_NOM = 'TPS';

const KEEP_CHILDREN = [
  { prenom: 'Hafsa', nom: 'Chemnanne', nomAliases: ['chemnane', 'chemnanne'] },
  { prenom: 'Lucas', nom: 'Martin', nomAliases: ['martin'] },
] as const;

const dryRun = process.argv.includes('--dry-run');

function normalize(s: string) {
  return s.trim().toLowerCase();
}

function childMatches(
  prenom: string,
  nom: string,
  target: (typeof KEEP_CHILDREN)[number],
): boolean {
  const p = normalize(prenom);
  const n = normalize(nom);
  if (p !== normalize(target.prenom)) return false;
  return target.nomAliases.some((alias) => n === alias || n.startsWith(alias.slice(0, 4)));
}

async function hashPassword(plain: string) {
  return bcrypt.hash(plain, 10);
}

async function deleteEnfantDependencies(enfantIds: string[], tx: PrismaClient) {
  if (enfantIds.length === 0) return;

  const journals = await tx.journalQuotidien.findMany({
    where: { enfantId: { in: enfantIds } },
    select: { id: true },
  });
  const journalIds = journals.map((j) => j.id);
  if (journalIds.length > 0) {
    await tx.entreeJournal.deleteMany({ where: { journalId: { in: journalIds } } });
  }

  await tx.journalQuotidien.deleteMany({ where: { enfantId: { in: enfantIds } } });
  await tx.presence.deleteMany({ where: { enfantId: { in: enfantIds } } });
  await tx.delegation.deleteMany({ where: { enfantId: { in: enfantIds } } });

  const profils = await tx.profilSante.findMany({
    where: { enfantId: { in: enfantIds } },
    select: { id: true },
  });
  const profilIds = profils.map((p) => p.id);
  if (profilIds.length > 0) {
    await tx.intolerance.deleteMany({ where: { profilSanteId: { in: profilIds } } });
    await tx.allergie.deleteMany({ where: { profilSanteId: { in: profilIds } } });
    await tx.vaccination.deleteMany({ where: { profilSanteId: { in: profilIds } } });
    await tx.autorisationMedicament.deleteMany({ where: { profilSanteId: { in: profilIds } } });
    await tx.profilSante.deleteMany({ where: { id: { in: profilIds } } });
  }

  const resumes = await tx.dailyResume.findMany({
    where: { enfantId: { in: enfantIds } },
    select: { id: true },
  });
  const resumeIds = resumes.map((r) => r.id);
  if (resumeIds.length > 0) {
    await tx.dailyResumeObservation.deleteMany({ where: { dailyResumeId: { in: resumeIds } } });
    await tx.dailyResume.deleteMany({ where: { id: { in: resumeIds } } });
  }
}

async function main() {
  console.log(dryRun ? '🔍 DRY RUN — aucune modification' : '🧹 CLEANUP production demo — démarrage');

  const allUsers = await prisma.utilisateur.findMany({
    select: { id: true, email: true, role: true, tuteurId: true, enseignantId: true },
  });
  const allEnfants = await prisma.enfant.findMany({
    select: { id: true, prenom: true, nom: true, familleId: true, classeId: true },
  });
  const allClasses = await prisma.classe.findMany({ select: { id: true, nom: true } });

  const keepUserEmails = new Set(KEEP_USER_EMAILS.map((e) => e.toLowerCase()));
  const keepUserIds = allUsers.filter((u) => keepUserEmails.has(u.email.toLowerCase())).map((u) => u.id);
  const removeUserIds = allUsers.filter((u) => !keepUserEmails.has(u.email.toLowerCase())).map((u) => u.id);

  const keepEnfantIds: string[] = [];
  for (const target of KEEP_CHILDREN) {
    const match = allEnfants.find((e) => childMatches(e.prenom, e.nom, target));
    if (!match) {
      throw new Error(`Enfant introuvable : ${target.prenom} ${target.nom}`);
    }
    keepEnfantIds.push(match.id);
  }

  const removeEnfantIds = allEnfants.filter((e) => !keepEnfantIds.includes(e.id)).map((e) => e.id);

  const targetClass = allClasses.find((c) => c.nom === TARGET_CLASS_NOM);
  if (!targetClass) {
    throw new Error(`Classe cible introuvable : ${TARGET_CLASS_NOM}`);
  }

  const parentUser = allUsers.find((u) => u.email.toLowerCase() === 'sophie.parent@wlw.ma');
  if (!parentUser?.tuteurId) {
    throw new Error('Compte parent sophie.parent@wlw.ma ou tuteur lié introuvable');
  }

  const parentTuteur = await prisma.tuteur.findUnique({
    where: { id: parentUser.tuteurId },
    select: { id: true, familleId: true },
  });
  if (!parentTuteur) {
    throw new Error('Tuteur parent introuvable');
  }

  const teacherUser = allUsers.find((u) => u.email.toLowerCase() === 'enseignant.sophie@test.com');
  const teacherEnseignantId = teacherUser?.enseignantId;
  if (!teacherUser || !teacherEnseignantId) {
    throw new Error('Enseignant sophie introuvable');
  }

  const removeTuteurIds = (
    await prisma.tuteur.findMany({
      where: { id: { not: parentTuteur.id } },
      select: { id: true },
    })
  ).map((t) => t.id);

  const removeEnseignantIds = (
    await prisma.enseignant.findMany({
      where: { id: { not: teacherEnseignantId } },
      select: { id: true },
    })
  ).map((e) => e.id);

  const removeFamilleIds = (
    await prisma.famille.findMany({
      where: { id: { not: parentTuteur.familleId } },
      select: { id: true },
    })
  ).map((f) => f.id);

  console.log('\n📊 Plan de nettoyage');
  console.log(`  Utilisateurs conservés : ${keepUserIds.length}`);
  console.log(`  Utilisateurs supprimés : ${removeUserIds.length}`);
  console.log(`  Enfants conservés     : ${keepEnfantIds.length}`);
  console.log(`  Enfants supprimés     : ${removeEnfantIds.length}`);
  console.log(`  Familles supprimées   : ${removeFamilleIds.length}`);
  console.log(`  Classe cible          : ${targetClass.nom} (${targetClass.id})`);

  if (dryRun) {
    console.log('\n✅ Dry run terminé — aucune écriture.');
    return;
  }

  await prisma.$transaction(
    async (tx) => {
      // Inscriptions / candidatures test
      const deletedInscriptions = await tx.inscription.deleteMany();
      console.log(`  ✓ Inscriptions supprimées : ${deletedInscriptions.count}`);

      // Diffusions liées aux tuteurs supprimés
      if (removeTuteurIds.length > 0) {
        await tx.diffusionResume.deleteMany({ where: { tuteurId: { in: removeTuteurIds } } });
      }

      await deleteEnfantDependencies(removeEnfantIds, tx as unknown as PrismaClient);
      const deletedEnfants = await tx.enfant.deleteMany({ where: { id: { in: removeEnfantIds } } });
      console.log(`  ✓ Enfants supprimés : ${deletedEnfants.count}`);

      const hafsaId = keepEnfantIds.find((id) => {
        const e = allEnfants.find((x) => x.id === id);
        return e && childMatches(e.prenom, e.nom, KEEP_CHILDREN[0]);
      })!;
      const lucasId = keepEnfantIds.find((id) => {
        const e = allEnfants.find((x) => x.id === id);
        return e && childMatches(e.prenom, e.nom, KEEP_CHILDREN[1]);
      })!;

      // Réassigner les enfants conservés avant suppression des familles orphelines
      await tx.enfant.update({
        where: { id: hafsaId },
        data: {
          prenom: 'Hafsa',
          nom: 'Chemnanne',
          familleId: parentTuteur.familleId,
          classeId: targetClass.id,
          archivedAt: null,
          archivedBy: null,
        },
      });
      await tx.enfant.update({
        where: { id: lucasId },
        data: {
          classeId: targetClass.id,
          archivedAt: null,
          archivedBy: null,
          remarques: null,
        },
      });

      // Sessions / restrictions utilisateurs supprimés
      if (removeUserIds.length > 0) {
        await tx.userSession.deleteMany({ where: { utilisateurId: { in: removeUserIds } } });
        await tx.userAccessRestriction.deleteMany({ where: { utilisateurId: { in: removeUserIds } } });
        const deletedUsers = await tx.utilisateur.deleteMany({ where: { id: { in: removeUserIds } } });
        console.log(`  ✓ Utilisateurs supprimés : ${deletedUsers.count}`);
      }

      if (removeTuteurIds.length > 0) {
        await tx.tuteur.deleteMany({ where: { id: { in: removeTuteurIds } } });
      }

      // Factures des familles supprimées
      if (removeFamilleIds.length > 0) {
        const factures = await tx.facture.findMany({
          where: { familleId: { in: removeFamilleIds } },
          select: { id: true },
        });
        const factureIds = factures.map((f) => f.id);
        if (factureIds.length > 0) {
          await tx.paiement.deleteMany({ where: { factureId: { in: factureIds } } });
          await tx.ligneFacture.deleteMany({ where: { factureId: { in: factureIds } } });
          await tx.facture.deleteMany({ where: { id: { in: factureIds } } });
        }
        await tx.famille.deleteMany({ where: { id: { in: removeFamilleIds } } });
      }

      if (removeEnseignantIds.length > 0) {
        await tx.enseignantClasse.deleteMany({ where: { enseignantId: { in: removeEnseignantIds } } });
        await tx.enseignant.deleteMany({ where: { id: { in: removeEnseignantIds } } });
      }

      // Historique / audit test (conserve les logs des comptes gardés)
      const keepEmails = [...KEEP_USER_EMAILS];
      await tx.loginHistory.deleteMany({
        where: {
          AND: [
            { email: { notIn: keepEmails } },
            { OR: [{ utilisateurId: null }, { utilisateurId: { in: removeUserIds } }] },
          ],
        },
      });
      await tx.auditLog.deleteMany({
        where: {
          AND: [
            { userEmail: { not: null } },
            { userEmail: { notIn: keepEmails } },
          ],
        },
      });

      // Enseignant Sophie → uniquement TPS
      await tx.enseignantClasse.deleteMany({
        where: {
          enseignantId: teacherEnseignantId,
          classeId: { not: targetClass.id },
        },
      });
      await tx.enseignantClasse.upsert({
        where: {
          enseignantId_classeId: {
            enseignantId: teacherEnseignantId,
            classeId: targetClass.id,
          },
        },
        update: { dateFin: null },
        create: {
          enseignantId: teacherEnseignantId,
          classeId: targetClass.id,
        },
      });

      // Comptes conservés : statut ACTIVE, mots de passe démo
      for (const email of KEEP_USER_EMAILS) {
        const hashed = await hashPassword(DEMO_PASSWORDS[email]);
        const role =
          email === 'admin@wlw.ma'
            ? RoleUtilisateur.SUPER_ADMIN
            : email === 'sophie@wlw.ma'
              ? RoleUtilisateur.ADMIN
              : email === 'enseignant.sophie@test.com'
                ? RoleUtilisateur.ENSEIGNANT
                : RoleUtilisateur.PARENT;

        await tx.utilisateur.update({
          where: { email },
          data: {
            role,
            statut: StatutUtilisateur.ACTIVE,
            tempPassword: hashed,
            activeLe: new Date(),
            archivedAt: null,
            deletedAt: null,
            sessionRevokedAt: null,
            passwordResetTokenHash: null,
            passwordResetExpires: null,
          },
        });
      }

      await tx.tuteur.update({
        where: { id: parentTuteur.id },
        data: {
          prenom: 'Sophie',
          nom: 'Parent',
          email: 'sophie.parent@wlw.ma',
          principal: true,
          lien: LienTuteur.Mere,
        },
      });

      await tx.famille.update({
        where: { id: parentTuteur.familleId },
        data: { emailPrincipal: 'sophie.parent@wlw.ma' },
      });

      // Révoquer les anciennes sessions des comptes gardés
      await tx.userSession.updateMany({
        where: { utilisateurId: { in: keepUserIds } },
        data: { revoked: true },
      });
    },
    { timeout: 120_000 },
  );

  const summary = {
    users: await prisma.utilisateur.count(),
    enfants: await prisma.enfant.count(),
    familles: await prisma.famille.count(),
    inscriptions: await prisma.inscription.count(),
    classes: await prisma.classe.count(),
    events: await prisma.event.count(),
    menus: await prisma.menu.count(),
  };

  console.log('\n🎉 Nettoyage terminé');
  console.log('  Résumé DB :', summary);

  const keptUsers = await prisma.utilisateur.findMany({
    select: { email: true, role: true, statut: true },
    orderBy: { email: 'asc' },
  });
  const keptChildren = await prisma.enfant.findMany({
    select: { prenom: true, nom: true, classeId: true },
    orderBy: { nom: 'asc' },
  });
  console.log('\n👤 Comptes conservés :');
  keptUsers.forEach((u) => console.log(`  - ${u.email} (${u.role}, ${u.statut})`));
  console.log('\n👶 Enfants conservés :');
  keptChildren.forEach((c) => console.log(`  - ${c.prenom} ${c.nom}`));
  console.log('\n🔑 Mots de passe démo :');
  for (const [email, pwd] of Object.entries(DEMO_PASSWORDS)) {
    console.log(`  - ${email} → ${pwd}`);
  }
  console.log('\n  Super Admin : connexion via /auth/login (ADMIN_PASSWORD env) ou mot de passe ci-dessus si login-user.');
}

main()
  .catch((e) => {
    console.error('❌ Échec du nettoyage :', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
