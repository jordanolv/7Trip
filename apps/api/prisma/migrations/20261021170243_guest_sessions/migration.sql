-- AlterTable
ALTER TABLE "Participant" ADD COLUMN     "guestTokenHash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Participant_guestTokenHash_key" ON "Participant"("guestTokenHash");
