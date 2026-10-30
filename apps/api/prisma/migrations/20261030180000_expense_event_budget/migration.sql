-- AlterTable
ALTER TABLE "Expense" ADD COLUMN     "eventId" UUID;

-- CreateTable
CREATE TABLE "PersonalBudget" (
    "participantId" UUID NOT NULL,
    "currency" TEXT NOT NULL,
    "totalMinor" INTEGER,
    "perCategory" JSONB NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PersonalBudget_pkey" PRIMARY KEY ("participantId")
);

-- CreateIndex
CREATE INDEX "Expense_eventId_idx" ON "Expense"("eventId");

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalBudget" ADD CONSTRAINT "PersonalBudget_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

