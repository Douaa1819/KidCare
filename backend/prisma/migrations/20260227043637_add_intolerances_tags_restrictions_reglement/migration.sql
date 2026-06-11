-- AlterTable
ALTER TABLE "ProfilSante" ADD COLUMN     "delegationAutorisee" BOOLEAN DEFAULT false,
ADD COLUMN     "delegationDetails" TEXT,
ADD COLUMN     "restrictionAlimentaire" TEXT,
ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "Intolerance" (
    "id" TEXT NOT NULL,
    "profilSanteId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "notes" TEXT,

    CONSTRAINT "Intolerance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReglementInterieur" (
    "id" TEXT NOT NULL,
    "contenu" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "modifiePar" TEXT,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modifieLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReglementInterieur_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Intolerance" ADD CONSTRAINT "Intolerance_profilSanteId_fkey" FOREIGN KEY ("profilSanteId") REFERENCES "ProfilSante"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
