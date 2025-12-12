-- CreateEnum
CREATE TYPE "LogType" AS ENUM ('system', 'activity');

-- CreateEnum
CREATE TYPE "LogLevel" AS ENUM ('info', 'warn', 'error', 'debug');

-- CreateTable
CREATE TABLE "LogEntry" (
    "id" SERIAL NOT NULL,
    "type" "LogType" NOT NULL,
    "level" "LogLevel" NOT NULL DEFAULT 'info',
    "message" TEXT NOT NULL,
    "meta" JSONB,
    "user_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LogEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LogEntry_type_created_at_idx" ON "LogEntry"("type", "created_at");

-- CreateIndex
CREATE INDEX "LogEntry_user_id_idx" ON "LogEntry"("user_id");

-- AddForeignKey
ALTER TABLE "LogEntry" ADD CONSTRAINT "LogEntry_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
