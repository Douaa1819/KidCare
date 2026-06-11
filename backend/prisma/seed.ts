/**
 * Seed minimal Petitspas — démo production (4 comptes, 1 famille, 2 enfants).
 *
 * ⚠️ Ne recrée PAS les 15 familles test.
 * Pour nettoyer une base existante : pnpm run cleanup:demo
 *
 * Usage :
 *   pnpm run seed              # upsert comptes démo + classes si absentes
 *   SEED_ALLOW=true pnpm seed  # autorisé en production (sinon refusé)
 */
import {
  PrismaClient,
  RoleUtilisateur,
  LienTuteur,
  StatutUtilisateur,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const DEMO_PASSWORDS = {
  'admin@wlw.ma': process.env.ADMIN_PASSWORD ?? 'change_me',
  'sophie@wlw.ma': 'Sophie123!',
  'enseignant.sophie@test.com': 'Teacher123!',
  'sophie.parent@wlw.ma': 'SophieParent123!',
} as const;

async function hashPassword(plain: string) {
  return bcrypt.hash(plain, 10);
}

async function ensureClasses() {
  const count = await prisma.classe.count();
  if (count > 0) {
    const tps = await prisma.classe.findFirst({ where: { nom: 'TPS' } });
    if (tps) return tps;
    return prisma.classe.findFirstOrThrow();
  }

  console.log('📚 Création des classes TPS / PS / MS...');
  await prisma.classe.createMany({
    data: [
      { nom: 'TPS', capacite: 15, trancheAge: '2-3 ans', active: true },
      { nom: 'PS', capacite: 15, trancheAge: '3-4 ans', active: true },
      { nom: 'MS', capacite: 15, trancheAge: '4-5 ans', active: true },
    ],
  });

  return prisma.classe.findFirstOrThrow({ where: { nom: 'TPS' } });
}

async function upsertDemoUser(
  email: keyof typeof DEMO_PASSWORDS,
  data: {
    prenom: string;
    nom: string;
    role: RoleUtilisateur;
    tuteurId?: string;
    enseignantId?: string;
  },
) {
  const hashed = await hashPassword(DEMO_PASSWORDS[email]);
  return prisma.utilisateur.upsert({
    where: { email },
    update: {
      prenom: data.prenom,
      nom: data.nom,
      role: data.role,
      statut: StatutUtilisateur.ACTIVE,
      tempPassword: hashed,
      activeLe: new Date(),
      archivedAt: null,
      deletedAt: null,
      ...(data.tuteurId ? { tuteurId: data.tuteurId } : {}),
      ...(data.enseignantId ? { enseignantId: data.enseignantId } : {}),
    },
    create: {
      email,
      prenom: data.prenom,
      nom: data.nom,
      role: data.role,
      statut: StatutUtilisateur.ACTIVE,
      tempPassword: hashed,
      activeLe: new Date(),
      tuteurId: data.tuteurId,
      enseignantId: data.enseignantId,
    },
  });
}

async function main() {
  const isProd = (process.env.NODE_ENV ?? 'development') === 'production';
  if (isProd && process.env.SEED_ALLOW !== 'true') {
    console.error(
      '❌ Seed refusé en production.\n' +
        '   Utilisez : pnpm run cleanup:demo\n' +
        '   Ou forcez : SEED_ALLOW=true pnpm run seed',
    );
    process.exit(1);
  }

  console.log('🌱 Seed minimal Petitspas (sans familles test)...');

  const classeTPS = await ensureClasses();

  // Super Admin
  await upsertDemoUser('admin@wlw.ma', {
    prenom: 'Admin',
    nom: 'System',
    role: RoleUtilisateur.SUPER_ADMIN,
  });

  // Admin Sophie
  await upsertDemoUser('sophie@wlw.ma', {
    prenom: 'Sophie',
    nom: 'Admin',
    role: RoleUtilisateur.ADMIN,
  });

  // Enseignant Sophie → TPS
  let enseignant = await prisma.enseignant.findFirst({
    where: { utilisateur: { email: 'enseignant.sophie@test.com' } },
  });
  if (!enseignant) {
    enseignant = await prisma.enseignant.create({ data: {} });
  }

  await upsertDemoUser('enseignant.sophie@test.com', {
    prenom: 'Sophie',
    nom: 'Enseignante',
    role: RoleUtilisateur.ENSEIGNANT,
    enseignantId: enseignant.id,
  });

  await prisma.enseignantClasse.upsert({
    where: {
      enseignantId_classeId: {
        enseignantId: enseignant.id,
        classeId: classeTPS.id,
      },
    },
    update: { dateFin: null },
    create: {
      enseignantId: enseignant.id,
      classeId: classeTPS.id,
    },
  });

  // Parent Sophie + famille
  const famille = await prisma.famille.upsert({
    where: { emailPrincipal: 'sophie.parent@wlw.ma' },
    update: { languePreferee: 'fr' },
    create: {
      emailPrincipal: 'sophie.parent@wlw.ma',
      languePreferee: 'fr',
    },
  });

  const tuteur = await prisma.tuteur.upsert({
    where: { email: 'sophie.parent@wlw.ma' },
    update: {
      prenom: 'Sophie',
      nom: 'Parent',
      principal: true,
      lien: LienTuteur.Mere,
      familleId: famille.id,
    },
    create: {
      email: 'sophie.parent@wlw.ma',
      prenom: 'Sophie',
      nom: 'Parent',
      telephone: '+212600000000',
      lien: LienTuteur.Mere,
      principal: true,
      familleId: famille.id,
    },
  });

  await upsertDemoUser('sophie.parent@wlw.ma', {
    prenom: 'Sophie',
    nom: 'Parent',
    role: RoleUtilisateur.PARENT,
    tuteurId: tuteur.id,
  });

  // 2 enfants — Hafsa Chemnanne & Lucas Martin (classe TPS)
  const enfants = [
    { prenom: 'Hafsa', nom: 'Chemnanne', dateNaissance: new Date('2021-01-10') },
    { prenom: 'Lucas', nom: 'Martin', dateNaissance: new Date('2022-01-05'), genre: 'M' },
  ] as const;

  for (const e of enfants) {
    const existing = await prisma.enfant.findFirst({
      where: { prenom: e.prenom, nom: e.nom, familleId: famille.id },
    });
    if (existing) {
      await prisma.enfant.update({
        where: { id: existing.id },
        data: {
          classeId: classeTPS.id,
          archivedAt: null,
          archivedBy: null,
          ...('genre' in e ? { genre: e.genre } : {}),
        },
      });
    } else {
      await prisma.enfant.create({
        data: {
          prenom: e.prenom,
          nom: e.nom,
          dateNaissance: e.dateNaissance,
          familleId: famille.id,
          classeId: classeTPS.id,
          ...('genre' in e ? { genre: e.genre } : {}),
        },
      });
    }
  }

  console.log('\n✅ Seed minimal terminé');
  console.log('   Comptes : admin@wlw.ma, sophie@wlw.ma, enseignant.sophie@test.com, sophie.parent@wlw.ma');
  console.log('   Enfants : Hafsa Chemnanne, Lucas Martin (TPS)');
  console.log('\n   Pour nettoyer une base avec données test : pnpm run cleanup:demo');
  console.log('\n🔑 Mots de passe :');
  for (const [email, pwd] of Object.entries(DEMO_PASSWORDS)) {
    console.log(`   - ${email} → ${pwd}`);
  }
}

main()
  .catch((e) => {
    console.error('❌ Erreur seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
