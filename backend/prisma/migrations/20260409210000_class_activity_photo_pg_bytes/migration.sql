-- Photos en PostgreSQL (BYTEA) — remplace imageUrl / storagePath
ALTER TABLE "ClassActivityPhoto" DROP COLUMN IF EXISTS "imageUrl";
ALTER TABLE "ClassActivityPhoto" DROP COLUMN IF EXISTS "storagePath";

ALTER TABLE "ClassActivityPhoto" ADD COLUMN IF NOT EXISTS "mimeType" TEXT NOT NULL DEFAULT 'image/jpeg';
ALTER TABLE "ClassActivityPhoto" ADD COLUMN IF NOT EXISTS "imageData" BYTEA NOT NULL DEFAULT '\x'::bytea;

ALTER TABLE "ClassActivityPhoto" ALTER COLUMN "mimeType" DROP DEFAULT;
ALTER TABLE "ClassActivityPhoto" ALTER COLUMN "imageData" DROP DEFAULT;

-- Anciennes lignes sans fichier binaire réel
DELETE FROM "ClassActivityPhoto" WHERE length("imageData") = 0;
