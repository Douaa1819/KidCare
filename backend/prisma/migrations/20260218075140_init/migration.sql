-- CreateEnum
CREATE TYPE "Langue" AS ENUM ('fr', 'ar');

-- CreateEnum
CREATE TYPE "RoleUtilisateur" AS ENUM ('PARENT', 'ENSEIGNANT', 'ADMIN');

-- CreateEnum
CREATE TYPE "StatutUtilisateur" AS ENUM ('INVITED', 'ACTIVE', 'DISABLED');

-- CreateEnum
CREATE TYPE "LienTuteur" AS ENUM ('Mere', 'Pere', 'Proche', 'Tuteur', 'Autre');

-- CreateEnum
CREATE TYPE "StatutInscription" AS ENUM ('CANDIDATURE', 'EN_COURS', 'ACTIF', 'REJETEE');

-- CreateEnum
CREATE TYPE "StatutPresence" AS ENUM ('Present', 'Absent', 'Justifie');

-- CreateEnum
CREATE TYPE "TypeEntree" AS ENUM ('Repas', 'Sieste', 'Humeur', 'Participation', 'Libre');

-- CreateEnum
CREATE TYPE "Audience" AS ENUM ('Parents', 'Enseignants', 'Tous');

-- CreateEnum
CREATE TYPE "CanalNotification" AS ENUM ('App', 'Email', 'WhatsApp');

-- CreateEnum
CREATE TYPE "StatutDiffusion" AS ENUM ('AEnvoyer', 'Envoye', 'Echec', 'Annule');

-- CreateEnum
CREATE TYPE "VisibiliteEvenement" AS ENUM ('Global', 'Classe', 'Prive');

-- CreateEnum
CREATE TYPE "StatutMenu" AS ENUM ('Brouillon', 'Publie');

-- CreateEnum
CREATE TYPE "NiveauAppetit" AS ENUM ('Excellent', 'Bon', 'Moyen', 'Faible', 'Refus');

-- CreateEnum
CREATE TYPE "NiveauHumeur" AS ENUM ('Excellent', 'Bon', 'Moyen', 'Difficile', 'Tres_difficile');

-- CreateEnum
CREATE TYPE "NiveauSieste" AS ENUM ('Excellent', 'Bon', 'Moyen', 'Difficile', 'Pas_de_sieste');

-- CreateEnum
CREATE TYPE "NiveauParticipation" AS ENUM ('Excellent', 'Bon', 'Moyen', 'Faible', 'Absent');

-- CreateEnum
CREATE TYPE "StatutResume" AS ENUM ('Brouillon', 'Publie');

-- CreateEnum
CREATE TYPE "EventAudience" AS ENUM ('CLASS', 'PARENTS_ALL');

-- CreateTable
CREATE TABLE "Classe" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "capacite" INTEGER,
    "trancheAge" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Classe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "description" TEXT,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "classeId" TEXT NOT NULL,
    "audience" "EventAudience" NOT NULL DEFAULT 'CLASS',
    "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Utilisateur" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telephone" TEXT,
    "prenom" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "langue" "Langue" NOT NULL DEFAULT 'fr',
    "role" "RoleUtilisateur" NOT NULL,
    "statut" "StatutUtilisateur" NOT NULL DEFAULT 'INVITED',
    "authUserId" TEXT,
    "tuteurId" TEXT,
    "enseignantId" TEXT,
    "tempPassword" TEXT,
    "inviteLe" TIMESTAMP(3),
    "activeLe" TIMESTAMP(3),
    "dernierAcces" TIMESTAMP(3),
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Utilisateur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Enseignant" (
    "id" TEXT NOT NULL,

    CONSTRAINT "Enseignant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnseignantClasse" (
    "id" TEXT NOT NULL,
    "enseignantId" TEXT NOT NULL,
    "classeId" TEXT NOT NULL,
    "dateDebut" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateFin" TIMESTAMP(3),

    CONSTRAINT "EnseignantClasse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Famille" (
    "id" TEXT NOT NULL,
    "emailPrincipal" TEXT NOT NULL,
    "languePreferee" "Langue" NOT NULL DEFAULT 'fr',
    "adresseFacturation" TEXT,

    CONSTRAINT "Famille_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tuteur" (
    "id" TEXT NOT NULL,
    "familleId" TEXT NOT NULL,
    "lien" "LienTuteur" NOT NULL,
    "prenom" TEXT,
    "nom" TEXT,
    "telephone" TEXT,
    "adresse" TEXT,
    "email" TEXT,
    "principal" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Tuteur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Enfant" (
    "id" TEXT NOT NULL,
    "familleId" TEXT NOT NULL,
    "classeId" TEXT,
    "prenom" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "dateNaissance" TIMESTAMP(3) NOT NULL,
    "genre" TEXT,
    "photoUrl" TEXT,

    CONSTRAINT "Enfant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inscription" (
    "id" TEXT NOT NULL,
    "statut" "StatutInscription" NOT NULL DEFAULT 'CANDIDATURE',
    "payload" JSONB NOT NULL DEFAULT '{}',
    "enfantId" TEXT,
    "familleId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Inscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Presence" (
    "id" TEXT NOT NULL,
    "enfantId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "statut" "StatutPresence" NOT NULL DEFAULT 'Present',
    "arriveeA" TIMESTAMP(3),
    "departA" TIMESTAMP(3),
    "enregistrePar" TEXT,

    CONSTRAINT "Presence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalQuotidien" (
    "id" TEXT NOT NULL,
    "enfantId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,

    CONSTRAINT "JournalQuotidien_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntreeJournal" (
    "id" TEXT NOT NULL,
    "journalId" TEXT NOT NULL,
    "type" "TypeEntree" NOT NULL,
    "valeur" TEXT NOT NULL,
    "creePar" TEXT,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EntreeJournal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalDeClasse" (
    "id" TEXT NOT NULL,
    "classeId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "resume" TEXT,
    "creePar" TEXT,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JournalDeClasse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiffusionResume" (
    "id" TEXT NOT NULL,
    "journalClasseId" TEXT NOT NULL,
    "tuteurId" TEXT NOT NULL,
    "canal" "CanalNotification" NOT NULL,
    "statut" "StatutDiffusion" NOT NULL DEFAULT 'AEnvoyer',
    "envoyeLe" TIMESTAMP(3),

    CONSTRAINT "DiffusionResume_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfilSante" (
    "id" TEXT NOT NULL,
    "enfantId" TEXT NOT NULL,
    "medecin" TEXT,
    "notes" TEXT,

    CONSTRAINT "ProfilSante_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vaccination" (
    "id" TEXT NOT NULL,
    "profilSanteId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "lot" TEXT,

    CONSTRAINT "Vaccination_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Allergie" (
    "id" TEXT NOT NULL,
    "profilSanteId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "severite" TEXT,
    "notes" TEXT,

    CONSTRAINT "Allergie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutorisationMedicament" (
    "id" TEXT NOT NULL,
    "profilSanteId" TEXT NOT NULL,
    "medicament" TEXT NOT NULL,
    "dosage" TEXT,
    "autorisePar" TEXT,
    "signeLe" TIMESTAMP(3),

    CONSTRAINT "AutorisationMedicament_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Facture" (
    "id" TEXT NOT NULL,
    "familleId" TEXT NOT NULL,
    "dateEmission" TIMESTAMP(3) NOT NULL,
    "dateEcheance" TIMESTAMP(3),
    "statut" TEXT NOT NULL DEFAULT 'Brouillon',
    "devise" TEXT NOT NULL DEFAULT 'MAD',
    "total" DECIMAL(65,30) NOT NULL DEFAULT 0,

    CONSTRAINT "Facture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LigneFacture" (
    "id" TEXT NOT NULL,
    "factureId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantite" INTEGER NOT NULL DEFAULT 1,
    "prixUnitaire" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "tauxTaxe" DECIMAL(65,30) NOT NULL DEFAULT 0,

    CONSTRAINT "LigneFacture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Paiement" (
    "id" TEXT NOT NULL,
    "factureId" TEXT NOT NULL,
    "montant" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "statut" TEXT NOT NULL DEFAULT 'EnAttente',
    "methode" TEXT,
    "referenceFournisseur" TEXT,
    "payeLe" TIMESTAMP(3),

    CONSTRAINT "Paiement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvenementCalendrier" (
    "id" TEXT NOT NULL,
    "classeId" TEXT,
    "titre" TEXT NOT NULL,
    "debutA" TIMESTAMP(3) NOT NULL,
    "finA" TIMESTAMP(3) NOT NULL,
    "lieu" TEXT,
    "visibilite" "VisibiliteEvenement" NOT NULL DEFAULT 'Global',

    CONSTRAINT "EvenementCalendrier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Menu" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "collationMatin" TEXT,
    "repas" TEXT,
    "gouter" TEXT,
    "statut" "StatutMenu" NOT NULL DEFAULT 'Brouillon',
    "creePar" TEXT NOT NULL,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" TIMESTAMP(3) NOT NULL,
    "publieLe" TIMESTAMP(3),

    CONSTRAINT "Menu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuAllergen" (
    "id" TEXT NOT NULL,
    "menuId" TEXT NOT NULL,
    "allergen" TEXT NOT NULL,

    CONSTRAINT "MenuAllergen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyResume" (
    "id" TEXT NOT NULL,
    "enfantId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "appetit" "NiveauAppetit",
    "humeur" "NiveauHumeur",
    "sieste" "NiveauSieste",
    "participation" "NiveauParticipation",
    "creePar" TEXT,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyResume_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyResumeObservation" (
    "id" TEXT NOT NULL,
    "dailyResumeId" TEXT NOT NULL,
    "observation" TEXT NOT NULL,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyResumeObservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassDailySummary" (
    "id" TEXT NOT NULL,
    "classeId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "activites" TEXT NOT NULL,
    "apprentissages" TEXT NOT NULL,
    "humeurGroupe" TEXT NOT NULL,
    "observations" TEXT,
    "statut" "StatutResume" NOT NULL DEFAULT 'Brouillon',
    "creePar" TEXT,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" TIMESTAMP(3) NOT NULL,
    "publieLe" TIMESTAMP(3),

    CONSTRAINT "ClassDailySummary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Event_classeId_startAt_idx" ON "Event"("classeId", "startAt");

-- CreateIndex
CREATE INDEX "Event_startAt_idx" ON "Event"("startAt");

-- CreateIndex
CREATE UNIQUE INDEX "Utilisateur_email_key" ON "Utilisateur"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Utilisateur_authUserId_key" ON "Utilisateur"("authUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Utilisateur_tuteurId_key" ON "Utilisateur"("tuteurId");

-- CreateIndex
CREATE UNIQUE INDEX "Utilisateur_enseignantId_key" ON "Utilisateur"("enseignantId");

-- CreateIndex
CREATE INDEX "Utilisateur_role_idx" ON "Utilisateur"("role");

-- CreateIndex
CREATE INDEX "Utilisateur_statut_idx" ON "Utilisateur"("statut");

-- CreateIndex
CREATE INDEX "Utilisateur_email_idx" ON "Utilisateur"("email");

-- CreateIndex
CREATE INDEX "EnseignantClasse_enseignantId_idx" ON "EnseignantClasse"("enseignantId");

-- CreateIndex
CREATE INDEX "EnseignantClasse_classeId_idx" ON "EnseignantClasse"("classeId");

-- CreateIndex
CREATE UNIQUE INDEX "EnseignantClasse_enseignantId_classeId_key" ON "EnseignantClasse"("enseignantId", "classeId");

-- CreateIndex
CREATE UNIQUE INDEX "Famille_emailPrincipal_key" ON "Famille"("emailPrincipal");

-- CreateIndex
CREATE UNIQUE INDEX "Tuteur_email_key" ON "Tuteur"("email");

-- CreateIndex
CREATE INDEX "Tuteur_familleId_idx" ON "Tuteur"("familleId");

-- CreateIndex
CREATE INDEX "Tuteur_email_idx" ON "Tuteur"("email");

-- CreateIndex
CREATE INDEX "Enfant_classeId_idx" ON "Enfant"("classeId");

-- CreateIndex
CREATE INDEX "Inscription_statut_idx" ON "Inscription"("statut");

-- CreateIndex
CREATE INDEX "Inscription_createdAt_idx" ON "Inscription"("createdAt");

-- CreateIndex
CREATE INDEX "Presence_date_idx" ON "Presence"("date");

-- CreateIndex
CREATE UNIQUE INDEX "Presence_enfantId_date_key" ON "Presence"("enfantId", "date");

-- CreateIndex
CREATE INDEX "JournalQuotidien_date_idx" ON "JournalQuotidien"("date");

-- CreateIndex
CREATE UNIQUE INDEX "JournalQuotidien_enfantId_date_key" ON "JournalQuotidien"("enfantId", "date");

-- CreateIndex
CREATE INDEX "JournalDeClasse_date_idx" ON "JournalDeClasse"("date");

-- CreateIndex
CREATE UNIQUE INDEX "JournalDeClasse_classeId_date_key" ON "JournalDeClasse"("classeId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "ProfilSante_enfantId_key" ON "ProfilSante"("enfantId");

-- CreateIndex
CREATE INDEX "Facture_dateEmission_idx" ON "Facture"("dateEmission");

-- CreateIndex
CREATE INDEX "EvenementCalendrier_debutA_idx" ON "EvenementCalendrier"("debutA");

-- CreateIndex
CREATE UNIQUE INDEX "Menu_date_key" ON "Menu"("date");

-- CreateIndex
CREATE INDEX "MenuAllergen_menuId_idx" ON "MenuAllergen"("menuId");

-- CreateIndex
CREATE UNIQUE INDEX "MenuAllergen_menuId_allergen_key" ON "MenuAllergen"("menuId", "allergen");

-- CreateIndex
CREATE INDEX "DailyResume_date_idx" ON "DailyResume"("date");

-- CreateIndex
CREATE INDEX "DailyResume_enfantId_idx" ON "DailyResume"("enfantId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyResume_enfantId_date_key" ON "DailyResume"("enfantId", "date");

-- CreateIndex
CREATE INDEX "DailyResumeObservation_dailyResumeId_idx" ON "DailyResumeObservation"("dailyResumeId");

-- CreateIndex
CREATE INDEX "ClassDailySummary_date_idx" ON "ClassDailySummary"("date");

-- CreateIndex
CREATE INDEX "ClassDailySummary_classeId_idx" ON "ClassDailySummary"("classeId");

-- CreateIndex
CREATE UNIQUE INDEX "ClassDailySummary_classeId_date_key" ON "ClassDailySummary"("classeId", "date");

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_classeId_fkey" FOREIGN KEY ("classeId") REFERENCES "Classe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Utilisateur" ADD CONSTRAINT "Utilisateur_tuteurId_fkey" FOREIGN KEY ("tuteurId") REFERENCES "Tuteur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Utilisateur" ADD CONSTRAINT "Utilisateur_enseignantId_fkey" FOREIGN KEY ("enseignantId") REFERENCES "Enseignant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnseignantClasse" ADD CONSTRAINT "EnseignantClasse_enseignantId_fkey" FOREIGN KEY ("enseignantId") REFERENCES "Enseignant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnseignantClasse" ADD CONSTRAINT "EnseignantClasse_classeId_fkey" FOREIGN KEY ("classeId") REFERENCES "Classe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tuteur" ADD CONSTRAINT "Tuteur_familleId_fkey" FOREIGN KEY ("familleId") REFERENCES "Famille"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enfant" ADD CONSTRAINT "Enfant_familleId_fkey" FOREIGN KEY ("familleId") REFERENCES "Famille"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enfant" ADD CONSTRAINT "Enfant_classeId_fkey" FOREIGN KEY ("classeId") REFERENCES "Classe"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inscription" ADD CONSTRAINT "Inscription_enfantId_fkey" FOREIGN KEY ("enfantId") REFERENCES "Enfant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inscription" ADD CONSTRAINT "Inscription_familleId_fkey" FOREIGN KEY ("familleId") REFERENCES "Famille"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Presence" ADD CONSTRAINT "Presence_enfantId_fkey" FOREIGN KEY ("enfantId") REFERENCES "Enfant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalQuotidien" ADD CONSTRAINT "JournalQuotidien_enfantId_fkey" FOREIGN KEY ("enfantId") REFERENCES "Enfant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntreeJournal" ADD CONSTRAINT "EntreeJournal_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "JournalQuotidien"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalDeClasse" ADD CONSTRAINT "JournalDeClasse_classeId_fkey" FOREIGN KEY ("classeId") REFERENCES "Classe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiffusionResume" ADD CONSTRAINT "DiffusionResume_journalClasseId_fkey" FOREIGN KEY ("journalClasseId") REFERENCES "JournalDeClasse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfilSante" ADD CONSTRAINT "ProfilSante_enfantId_fkey" FOREIGN KEY ("enfantId") REFERENCES "Enfant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vaccination" ADD CONSTRAINT "Vaccination_profilSanteId_fkey" FOREIGN KEY ("profilSanteId") REFERENCES "ProfilSante"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Allergie" ADD CONSTRAINT "Allergie_profilSanteId_fkey" FOREIGN KEY ("profilSanteId") REFERENCES "ProfilSante"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutorisationMedicament" ADD CONSTRAINT "AutorisationMedicament_profilSanteId_fkey" FOREIGN KEY ("profilSanteId") REFERENCES "ProfilSante"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Facture" ADD CONSTRAINT "Facture_familleId_fkey" FOREIGN KEY ("familleId") REFERENCES "Famille"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LigneFacture" ADD CONSTRAINT "LigneFacture_factureId_fkey" FOREIGN KEY ("factureId") REFERENCES "Facture"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Paiement" ADD CONSTRAINT "Paiement_factureId_fkey" FOREIGN KEY ("factureId") REFERENCES "Facture"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvenementCalendrier" ADD CONSTRAINT "EvenementCalendrier_classeId_fkey" FOREIGN KEY ("classeId") REFERENCES "Classe"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuAllergen" ADD CONSTRAINT "MenuAllergen_menuId_fkey" FOREIGN KEY ("menuId") REFERENCES "Menu"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyResume" ADD CONSTRAINT "DailyResume_enfantId_fkey" FOREIGN KEY ("enfantId") REFERENCES "Enfant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyResumeObservation" ADD CONSTRAINT "DailyResumeObservation_dailyResumeId_fkey" FOREIGN KEY ("dailyResumeId") REFERENCES "DailyResume"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassDailySummary" ADD CONSTRAINT "ClassDailySummary_classeId_fkey" FOREIGN KEY ("classeId") REFERENCES "Classe"("id") ON DELETE CASCADE ON UPDATE CASCADE;
