-- AlterTable
ALTER TABLE "Utilisateur" ADD COLUMN IF NOT EXISTS "emailNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true;
