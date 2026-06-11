-- AlterTable: add soft-delete fields to Enfant
-- Loi 09-08 (Maroc) + Loi 25 (Québec): conservation ≥ 3-5 ans, suppression physique interdite
ALTER TABLE "Enfant" ADD COLUMN "archivedAt" TIMESTAMP(3);
ALTER TABLE "Enfant" ADD COLUMN "archivedBy" TEXT;

-- CreateIndex
CREATE INDEX "Enfant_archivedAt_idx" ON "Enfant"("archivedAt");
