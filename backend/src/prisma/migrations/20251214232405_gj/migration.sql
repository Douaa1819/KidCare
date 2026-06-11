/*
  Warnings:

  - Made the column `creePar` on table `Menu` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "public"."Menu_date_idx";

-- DropIndex
DROP INDEX "public"."Menu_statut_idx";

-- AlterTable
ALTER TABLE "Menu" ALTER COLUMN "creePar" SET NOT NULL;
