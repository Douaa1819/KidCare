-- AlterTable
ALTER TABLE "Utilisateur" ADD COLUMN "passwordResetTokenHash" TEXT;
ALTER TABLE "Utilisateur" ADD COLUMN "passwordResetExpires" TIMESTAMP(3);
