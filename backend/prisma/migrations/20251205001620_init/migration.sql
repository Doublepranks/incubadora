-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('instagram', 'x', 'youtube', 'kwai', 'tiktok');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('success', 'error');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Influencer" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "avatar_url" TEXT,
    "state" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Influencer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialProfile" (
    "id" SERIAL NOT NULL,
    "influencer_id" INTEGER NOT NULL,
    "platform" "Platform" NOT NULL,
    "handle" TEXT NOT NULL,
    "url" TEXT,
    "external_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SocialProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetricDaily" (
    "id" SERIAL NOT NULL,
    "social_profile_id" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "followers_count" INTEGER NOT NULL,
    "posts_count" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MetricDaily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncLog" (
    "id" SERIAL NOT NULL,
    "social_profile_id" INTEGER,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),
    "status" "SyncStatus" NOT NULL,
    "error_message" TEXT,

    CONSTRAINT "SyncLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "SocialProfile_influencer_id_idx" ON "SocialProfile"("influencer_id");

-- CreateIndex
CREATE INDEX "MetricDaily_social_profile_id_date_idx" ON "MetricDaily"("social_profile_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "MetricDaily_social_profile_id_date_key" ON "MetricDaily"("social_profile_id", "date");

-- CreateIndex
CREATE INDEX "SyncLog_social_profile_id_idx" ON "SyncLog"("social_profile_id");

-- AddForeignKey
ALTER TABLE "SocialProfile" ADD CONSTRAINT "SocialProfile_influencer_id_fkey" FOREIGN KEY ("influencer_id") REFERENCES "Influencer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetricDaily" ADD CONSTRAINT "MetricDaily_social_profile_id_fkey" FOREIGN KEY ("social_profile_id") REFERENCES "SocialProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncLog" ADD CONSTRAINT "SyncLog_social_profile_id_fkey" FOREIGN KEY ("social_profile_id") REFERENCES "SocialProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
