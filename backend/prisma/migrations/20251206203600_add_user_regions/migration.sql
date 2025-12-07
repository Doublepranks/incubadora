-- CreateTable
CREATE TABLE "UserRegion" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "uf" CHAR(2) NOT NULL,

    CONSTRAINT "UserRegion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserRegion_user_id_idx" ON "UserRegion"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "UserRegion_user_id_uf_key" ON "UserRegion"("user_id", "uf");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- AddForeignKey
ALTER TABLE "UserRegion" ADD CONSTRAINT "UserRegion_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
