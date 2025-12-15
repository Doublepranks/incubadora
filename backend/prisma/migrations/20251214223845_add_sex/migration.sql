-- CreateEnum
CREATE TYPE "Sex" AS ENUM ('masculino', 'feminino');

-- AlterTable
ALTER TABLE "Influencer" ADD COLUMN     "sex" "Sex";
