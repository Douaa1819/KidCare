/**
 * Prépare la base KidCare pour une démo production :
 * conserve 4 comptes, 2 enfants, classes/événements/menus/paramètres plateforme.
 *
 * Usage:
 *   pnpm run cleanup:demo:dry-run
 *   pnpm run cleanup:demo
 *   SHOW_DEMO_CREDENTIALS=true pnpm run cleanup:demo   # affiche les mots de passe (dev uniquement)
 *
 * Variables d'environnement :
 *   ADMIN_PASSWORD          — mot de passe Super Admin (défaut: change_me)
 *   DEMO_ADMIN_PASSWORD     — mot de passe Admin sophie@demo.kidcare.app
 *   DEMO_TEACHER_PASSWORD   — mot de passe enseignant
 *   DEMO_PARENT_PASSWORD    — mot de passe parent
 *   SHOW_DEMO_CREDENTIALS   — "true" pour afficher les identifiants en fin de script
 */
import {
  PrismaClient,
  RoleUtilisateur,
  LienTuteur,
  StatutUtilisateur,
  type Prisma,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const KEEP_USER_EMAILS = [
  'admin@demo.kidcare.app',
  'sophie@demo.kidcare.app',
  'enseignant.sophie@test.com',
  'sophie.parent@demo.kidcare.app',
] as const;

type KeepEmail = (typeof KEEP_USER_EMAILS)[number];

const KEEP_CHILDREN = [
  { prenom: 'Hafsa', nom: 'Chemnanne', nomAliases: ['chemnane', 'chemnanne'] },
  { prenom: 'Lucas', nom: 'Martin', nomAliases: ['martin'] },
] as const;

const FALLBACK_CLASS_NOM = 'TPS';

const dryRun = process.argv.includes('--dry-run');
const isProd = (process.env.NODE_ENV ?? 'development') === 'production';
const showCredentials =
  process.env.SHOW_DEMO_CREDENTIALS === 'true' ||
  (!isProd && process.env.SHOW_DEMO_CREDENTIALS !== 'false');

function resolveDemoPasswords(): Record<KeepEmail, string> {
  return {
    'admin@demo.kidcare.app': process.env.ADMIN_PASSWORD ?? 'change_me',
    'sophie@demo.kidcare.app': process.env.DEMO_ADMIN_PASSWORD ?? 'Sophie123!',
    'enseignant.sophie@test.com': process.env.DEMO_TEACHER_PASSWORD ?? 'Teacher123!',
    'sophie.parent@demo.kidcare.app': process.env.DEMO_PARENT_PASSWORD ?? 'SophieParent123!',
  };
}

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

async function deleteEnfantDependencies(enfantIds: string[], tx: Prisma.TransactionClient) {
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

function resolveTargetClassId(
  keepEnfantIds: string[],
  allEnfants: Array<{ id: string; classeId: string | null }>,
  allClasses: Array<{ id: string; nom: string }>,
): string {
  const counts = new Map<string, number>();
  for (const id of keepEnfantIds) {
    const enfant = allEnfants.find((e) => e.id === id);
    if (enfant?.classeId) {
      counts.set(enfant.classeId, (counts.get(enfant.classeId) ?? 0) + 1);
    }
  }

  const fromChildren = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  if (fromChildren) return fromChildren;

  const fallback = allClasses.find((c) => c.nom === FALLBACK_CLASS_NOM);
  if (fallback) return fallback.id;

  if (allClasses.length === 0) {
    throw new Error('Aucune classe en base — créez les classes avant le nettoyage.');
  }

  return allClasses[0]!.id;
}

async function ensureKeptUsersExist(
  tx: Prisma.TransactionClient,
  passwords: Record<KeepEmail, string>,
  targetClassId: string,
): Promise<{
  parentTuteurId: string;
  parentFamilleId: string;
  teacherEnseignantId: string;
  keepUserIds: string[];
}> {
  const classe = await tx.classe.findUnique({ where: { id: targetClassId } });

  if (!classe) {
    throw new Error(`Classe cible introuvable (${targetClassId}).`);
  }

  let enseignant = await tx.enseignant.findFirst({
    where: { utilisateur: { email: 'enseignant.sophie@test.com' } },
  });
  if (!enseignant) {
    enseignant = await tx.enseignant.create({ data: { fonction: 'Éducatrice' } });
  }

  const famille = await tx.famille.upsert({
    where: { emailPrincipal: 'sophie.parent@demo.kidcare.app' },
    update: { languePreferee: 'fr' },
    create: { emailPrincipal: 'sophie.parent@demo.kidcare.app', languePreferee: 'fr' },
  });

  const tuteur = await tx.tuteur.upsert({
    where: { email: 'sophie.parent@demo.kidcare.app' },
    update: {
      prenom: 'Sophie',
      nom: 'Parent',
      principal: true,
      lien: LienTuteur.Mere,
      familleId: famille.id,
    },
    create: {
      email: 'sophie.parent@demo.kidcare.app',
      prenom: 'Sophie',
      nom: 'Parent',
      telephone: '+212600000000',
      lien: LienTuteur.Mere,
      principal: true,
      familleId: famille.id,
    },
  });

  const userSpecs: Array<{
    email: KeepEmail;
    prenom: string;
    nom: string;
    role: RoleUtilisateur;
    tuteurId?: string;
    enseignantId?: string;
  }> = [
    { email: 'admin@demo.kidcare.app', prenom: 'Admin', nom: 'System', role: RoleUtilisateur.SUPER_ADMIN },
    { email: 'sophie@demo.kidcare.app', prenom: 'Sophie', nom: 'Admin', role: RoleUtilisateur.ADMIN },
    {
      email: 'enseignant.sophie@test.com',
      prenom: 'Sophie',
      nom: 'Enseignante',
      role: RoleUtilisateur.ENSEIGNANT,
      enseignantId: enseignant.id,
    },
    {
      email: 'sophie.parent@demo.kidcare.app',
      prenom: 'Sophie',
      nom: 'Parent',
      role: RoleUtilisateur.PARENT,
      tuteurId: tuteur.id,
    },
  ];

  const keepUserIds: string[] = [];

  for (const spec of userSpecs) {
    const hashed = await hashPassword(passwords[spec.email]);
    const user = await tx.utilisateur.upsert({
      where: { email: spec.email },
      update: {
        prenom: spec.prenom,
        nom: spec.nom,
        role: spec.role,
        statut: StatutUtilisateur.ACTIVE,
        tempPassword: hashed,
        activeLe: new Date(),
        archivedAt: null,
        deletedAt: null,
        sessionRevokedAt: null,
        passwordResetTokenHash: null,
        passwordResetExpires: null,
        tuteurId: spec.role === RoleUtilisateur.PARENT ? spec.tuteurId ?? null : null,
        enseignantId: spec.role === RoleUtilisateur.ENSEIGNANT ? spec.enseignantId ?? null : null,
      },
      create: {
        email: spec.email,
        prenom: spec.prenom,
        nom: spec.nom,
        role: spec.role,
        statut: StatutUtilisateur.ACTIVE,
        tempPassword: hashed,
        activeLe: new Date(),
        tuteurId: spec.tuteurId,
        enseignantId: spec.enseignantId,
      },
    });
    keepUserIds.push(user.id);
  }

  await tx.enseignantClasse.upsert({
    where: {
      enseignantId_classeId: { enseignantId: enseignant.id, classeId: classe.id },
    },
    update: { dateFin: null },
    create: { enseignantId: enseignant.id, classeId: classe.id },
  });

  return {
    parentTuteurId: tuteur.id,
    parentFamilleId: famille.id,
    teacherEnseignantId: enseignant.id,
    keepUserIds,
  };
}

async function ensureKeptChildren(
  tx: Prisma.TransactionClient,
  parentFamilleId: string,
  targetClassId: string,
  existingKeepIds: string[],
  allEnfants: Array<{ id: string; prenom: string; nom: string }>,
): Promise<string[]> {
  const keepIds: string[] = [];

  const defaults = [
    { prenom: 'Hafsa', nom: 'Chemnanne', dateNaissance: new Date('2021-01-10') },
    { prenom: 'Lucas', nom: 'Martin', dateNaissance: new Date('2022-01-05'), genre: 'M' },
  ] as const;

  for (let i = 0; i < KEEP_CHILDREN.length; i++) {
    const target = KEEP_CHILDREN[i]!;
    const def = defaults[i]!;

    let enfantId = existingKeepIds.find((id) => {
      const e = allEnfants.find((x) => x.id === id);
      return e && childMatches(e.prenom, e.nom, target);
    });

    if (!enfantId) {
      const existing = await tx.enfant.findFirst({
        where: { prenom: def.prenom, nom: def.nom },
      });
      if (existing) {
        enfantId = existing.id;
      } else {
        const created = await tx.enfant.create({
          data: {
            prenom: def.prenom,
            nom: def.nom,
            dateNaissance: def.dateNaissance,
            familleId: parentFamilleId,
            classeId: targetClassId,
            ...('genre' in def ? { genre: def.genre } : {}),
          },
        });
        enfantId = created.id;
        console.log(`  ✓ Enfant créé : ${def.prenom} ${def.nom}`);
      }
    }

    await tx.enfant.update({
      where: { id: enfantId },
      data: {
        prenom: def.prenom,
        nom: def.nom,
        familleId: parentFamilleId,
        classeId: targetClassId,
        archivedAt: null,
        archivedBy: null,
      },
    });

    keepIds.push(enfantId);
  }

  return keepIds;
}

async function main() {
  console.log(dryRun ? '🔍 DRY RUN — aucune modification' : '🧹 CLEANUP production demo — démarrage');

  const passwords = resolveDemoPasswords();

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
    if (match) keepEnfantIds.push(match.id);
  }

  const targetClassId = resolveTargetClassId(keepEnfantIds, allEnfants, allClasses);
  const targetClass = allClasses.find((c) => c.id === targetClassId);

  const removeEnfantIds = allEnfants.filter((e) => !keepEnfantIds.includes(e.id)).map((e) => e.id);

  console.log('\n📊 Plan de nettoyage');
  console.log(`  Utilisateurs conservés : ${keepUserIds.length} / ${KEEP_USER_EMAILS.length}`);
  console.log(`  Utilisateurs supprimés : ${removeUserIds.length}`);
  console.log(`  Enfants trouvés        : ${keepEnfantIds.length} / ${KEEP_CHILDREN.length}`);
  console.log(`  Enfants supprimés     : ${removeEnfantIds.length}`);
  console.log(`  Classe cible          : ${targetClass?.nom ?? targetClassId}`);

  if (dryRun) {
    console.log('\n✅ Dry run terminé — aucune écriture.');
    console.log('   Exécutez : pnpm run cleanup:demo');
    return;
  }

  if (isProd && process.env.CLEANUP_ALLOW !== 'true') {
    console.error(
      '\n❌ Nettoyage refusé en production.\n' +
        '   Définissez CLEANUP_ALLOW=true pour confirmer.',
    );
    process.exit(1);
  }

  await prisma.$transaction(
    async (tx) => {
      const ensured = await ensureKeptUsersExist(tx, passwords, targetClassId);

      await tx.tuteur.deleteMany({
        where: {
          familleId: ensured.parentFamilleId,
          id: { not: ensured.parentTuteurId },
        },
      });

      const deletedInscriptions = await tx.inscription.deleteMany();
      console.log(`  ✓ Inscriptions supprimées : ${deletedInscriptions.count}`);

      const removeTuteurIds = (
        await tx.tuteur.findMany({
          where: { id: { not: ensured.parentTuteurId } },
          select: { id: true },
        })
      ).map((t) => t.id);

      if (removeTuteurIds.length > 0) {
        await tx.diffusionResume.deleteMany({ where: { tuteurId: { in: removeTuteurIds } } });
      }

      await deleteEnfantDependencies(removeEnfantIds, tx);
      if (removeEnfantIds.length > 0) {
        await tx.enfant.updateMany({
          where: { archivedBy: { in: removeUserIds } },
          data: { archivedBy: null },
        });
        const deletedEnfants = await tx.enfant.deleteMany({ where: { id: { in: removeEnfantIds } } });
        console.log(`  ✓ Enfants supprimés : ${deletedEnfants.count}`);
      }

      const finalKeepEnfantIds = await ensureKeptChildren(
        tx,
        ensured.parentFamilleId,
        targetClassId,
        keepEnfantIds,
        allEnfants,
      );

      if (removeUserIds.length > 0) {
        await tx.loginHistory.deleteMany({ where: { utilisateurId: { in: removeUserIds } } });
        await tx.userSession.deleteMany({ where: { utilisateurId: { in: removeUserIds } } });
        await tx.userAccessRestriction.deleteMany({ where: { utilisateurId: { in: removeUserIds } } });
        const deletedUsers = await tx.utilisateur.deleteMany({ where: { id: { in: removeUserIds } } });
        console.log(`  ✓ Utilisateurs supprimés : ${deletedUsers.count}`);
      }

      if (removeTuteurIds.length > 0) {
        await tx.tuteur.deleteMany({ where: { id: { in: removeTuteurIds } } });
      }

      const removeFamilleIds = (
        await tx.famille.findMany({
          where: { id: { not: ensured.parentFamilleId } },
          select: { id: true },
        })
      ).map((f) => f.id);

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
        console.log(`  ✓ Familles supprimées : ${removeFamilleIds.length}`);
      }

      const removeEnseignantIds = (
        await tx.enseignant.findMany({
          where: { id: { not: ensured.teacherEnseignantId } },
          select: { id: true },
        })
      ).map((e) => e.id);

      if (removeEnseignantIds.length > 0) {
        await tx.enseignantClasse.deleteMany({ where: { enseignantId: { in: removeEnseignantIds } } });
        await tx.enseignant.deleteMany({ where: { id: { in: removeEnseignantIds } } });
        console.log(`  ✓ Enseignants supprimés : ${removeEnseignantIds.length}`);
      }

      const keepEmails = [...KEEP_USER_EMAILS];
      await tx.loginHistory.deleteMany({
        where: {
          email: { notIn: keepEmails },
          OR: [{ utilisateurId: null }, { utilisateurId: { notIn: ensured.keepUserIds } }],
        },
      });
      await tx.auditLog.deleteMany({
        where: {
          userEmail: { not: null, notIn: keepEmails },
        },
      });

      await tx.enseignantClasse.deleteMany({
        where: {
          enseignantId: ensured.teacherEnseignantId,
          classeId: { not: targetClassId },
        },
      });
      await tx.enseignantClasse.upsert({
        where: {
          enseignantId_classeId: {
            enseignantId: ensured.teacherEnseignantId,
            classeId: targetClassId,
          },
        },
        update: { dateFin: null },
        create: {
          enseignantId: ensured.teacherEnseignantId,
          classeId: targetClassId,
        },
      });

      for (const email of KEEP_USER_EMAILS) {
        const hashed = await hashPassword(passwords[email]);
        const role =
          email === 'admin@demo.kidcare.app'
            ? RoleUtilisateur.SUPER_ADMIN
            : email === 'sophie@demo.kidcare.app'
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

      await tx.userSession.updateMany({
        where: { utilisateurId: { in: ensured.keepUserIds } },
        data: { revoked: true },
      });

      console.log(`  ✓ Enfants conservés : ${finalKeepEnfantIds.length}`);
      console.log(`  ✓ Enseignant assigné à la classe ${targetClass?.nom ?? targetClassId}`);
    },
    { timeout: 180_000 },
  );

  const summary = {
    users: await prisma.utilisateur.count(),
    enfants: await prisma.enfant.count(),
    familles: await prisma.famille.count(),
    inscriptions: await prisma.inscription.count(),
    classes: await prisma.classe.count(),
    events: await prisma.event.count(),
    menus: await prisma.menu.count(),
    platformSettings: await prisma.platformSettings.count(),
    featureFlags: await prisma.featureFlag.count(),
  };

  console.log('\n🎉 Nettoyage terminé');
  console.log('  Résumé DB :', summary);

  const keptUsers = await prisma.utilisateur.findMany({
    select: { email: true, role: true, statut: true },
    orderBy: { email: 'asc' },
  });
  const keptChildren = await prisma.enfant.findMany({
    select: { prenom: true, nom: true, classe: { select: { nom: true } } },
    orderBy: { nom: 'asc' },
  });

  console.log('\n👤 Comptes conservés :');
  keptUsers.forEach((u) => console.log(`  - ${u.email} (${u.role}, ${u.statut})`));
  console.log('\n👶 Enfants conservés :');
  keptChildren.forEach((c) => console.log(`  - ${c.prenom} ${c.nom} (${c.classe?.nom ?? '—'})`));

  if (showCredentials) {
    console.log('\n🔑 Identifiants démo (dev — ne pas exposer en production) :');
    for (const [email, pwd] of Object.entries(passwords)) {
      console.log(`  - ${email} → ${pwd}`);
    }
  } else {
    console.log('\n🔒 Mots de passe réinitialisés (bcrypt hash en base).');
    console.log('  SHOW_DEMO_CREDENTIALS=true pour afficher les mots de passe en local.');
    if (isProd) {
      console.log('  Production : définissez ADMIN_PASSWORD, DEMO_ADMIN_PASSWORD, DEMO_TEACHER_PASSWORD, DEMO_PARENT_PASSWORD avant le cleanup.');
    }
  }
}

main()
  .catch((e) => {
    console.error('❌ Échec du nettoyage :', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
