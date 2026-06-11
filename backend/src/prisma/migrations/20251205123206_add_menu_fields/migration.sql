/*
  Warnings:

  - You are about to drop the column `dessert` on the `Menu` table. All the data in the column will be lost.
  - You are about to drop the column `entree` on the `Menu` table. All the data in the column will be lost.
  - You are about to drop the column `plat` on the `Menu` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Menu" DROP COLUMN "dessert",
DROP COLUMN "entree",
DROP COLUMN "plat",
ADD COLUMN     "collationMatin" TEXT,
ADD COLUMN     "gouter" TEXT,
ADD COLUMN     "repas" TEXT;
