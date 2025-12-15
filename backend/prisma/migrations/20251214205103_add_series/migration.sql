-- CreateEnum
CREATE TYPE "Series" AS ENUM ('Elite', 'A2', 'A3', 'Institucional', 'Cortes', 'Noticias');

-- AlterTable
ALTER TABLE "Influencer" ADD COLUMN     "series" "Series";
