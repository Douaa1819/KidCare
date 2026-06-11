-- CreateTable
CREATE TABLE "ClassActivityPhoto" (
    "id" TEXT NOT NULL,
    "classeId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "legende" TEXT,
    "creeParId" TEXT,
    "creeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassActivityPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClassActivityPhoto_classeId_date_idx" ON "ClassActivityPhoto"("classeId", "date");

-- CreateIndex
CREATE INDEX "ClassActivityPhoto_date_idx" ON "ClassActivityPhoto"("date");

-- AddForeignKey
ALTER TABLE "ClassActivityPhoto" ADD CONSTRAINT "ClassActivityPhoto_classeId_fkey" FOREIGN KEY ("classeId") REFERENCES "Classe"("id") ON DELETE CASCADE ON UPDATE CASCADE;
