-- CreateEnum
CREATE TYPE "GoalType" AS ENUM ('followers', 'posts');

-- CreateEnum
CREATE TYPE "GoalStatus" AS ENUM ('active', 'achieved', 'failed', 'cancelled');

-- CreateTable
CREATE TABLE "InfluencerGoal" (
    "id" SERIAL NOT NULL,
    "influencer_id" INTEGER NOT NULL,
    "type" "GoalType" NOT NULL,
    "status" "GoalStatus" NOT NULL DEFAULT 'active',
    "target_value" INTEGER NOT NULL,
    "platform" "Platform",
    "deadline" TIMESTAMP(3) NOT NULL,
    "initial_value" INTEGER,
    "current_value" INTEGER,
    "achieved_at" TIMESTAMP(3),
    "description" TEXT,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InfluencerGoal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InfluencerGoal_influencer_id_idx" ON "InfluencerGoal"("influencer_id");

-- CreateIndex
CREATE INDEX "InfluencerGoal_status_idx" ON "InfluencerGoal"("status");

-- CreateIndex
CREATE INDEX "InfluencerGoal_deadline_idx" ON "InfluencerGoal"("deadline");

-- AddForeignKey
ALTER TABLE "InfluencerGoal" ADD CONSTRAINT "InfluencerGoal_influencer_id_fkey" FOREIGN KEY ("influencer_id") REFERENCES "Influencer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InfluencerGoal" ADD CONSTRAINT "InfluencerGoal_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
