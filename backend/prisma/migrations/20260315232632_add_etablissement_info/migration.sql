-- CreateTable
CREATE TABLE "EtablissementInfo" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "nom" TEXT NOT NULL DEFAULT '',
    "adresse" TEXT NOT NULL DEFAULT '',
    "telephone" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "siteWeb" TEXT,
    "description" TEXT,
    "horaires" TEXT,
    "capacite" INTEGER,
    "modifiePar" TEXT,
    "modifieLe" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EtablissementInfo_pkey" PRIMARY KEY ("id")
);
