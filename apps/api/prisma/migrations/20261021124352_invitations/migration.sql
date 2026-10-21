-- AlterTable
ALTER TABLE "Participant" ADD COLUMN     "leftAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Invitation" (
    "id" UUID NOT NULL,
    "tripId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "createdById" UUID NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "usesCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_code_key" ON "Invitation"("code");

-- CreateIndex
CREATE INDEX "Invitation_tripId_idx" ON "Invitation"("tripId");

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
