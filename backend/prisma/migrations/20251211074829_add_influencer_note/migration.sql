-- CreateTable
CREATE TABLE "InfluencerNote" (
    "id" SERIAL NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "influencer_id" INTEGER NOT NULL,
    "user_id" INTEGER,

    CONSTRAINT "InfluencerNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InfluencerNote_influencer_id_idx" ON "InfluencerNote"("influencer_id");

-- AddForeignKey
ALTER TABLE "InfluencerNote" ADD CONSTRAINT "InfluencerNote_influencer_id_fkey" FOREIGN KEY ("influencer_id") REFERENCES "Influencer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InfluencerNote" ADD CONSTRAINT "InfluencerNote_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
