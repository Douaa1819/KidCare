-- AlterTable
ALTER TABLE "Enfant" ADD COLUMN     "intolerances" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "sansRestriction" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Delegation" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "telephone" TEXT NOT NULL,
    "cin" TEXT NOT NULL,
    "relation" TEXT NOT NULL,
    "enfantId" TEXT NOT NULL,

    CONSTRAINT "Delegation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Delegation_enfantId_idx" ON "Delegation"("enfantId");

-- AddForeignKey
ALTER TABLE "Delegation" ADD CONSTRAINT "Delegation_enfantId_fkey" FOREIGN KEY ("enfantId") REFERENCES "Enfant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
