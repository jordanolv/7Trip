-- AlterTable
ALTER TABLE "Participant" ADD COLUMN     "notifPrefs" JSONB;

-- CreateTable
CREATE TABLE "PushToken" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "timeZone" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PushToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" UUID NOT NULL,
    "participantId" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "key" TEXT,
    "refId" UUID,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "claimedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "sentAt" TIMESTAMP(3),
    "outcome" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PushToken_token_key" ON "PushToken"("token");

-- CreateIndex
CREATE INDEX "PushToken_userId_idx" ON "PushToken"("userId");

-- CreateIndex
CREATE INDEX "Notification_sentAt_scheduledAt_idx" ON "Notification"("sentAt", "scheduledAt");

-- CreateIndex
CREATE INDEX "Notification_key_idx" ON "Notification"("key");

-- CreateIndex
CREATE INDEX "Notification_participantId_idx" ON "Notification"("participantId");

-- AddForeignKey
ALTER TABLE "PushToken" ADD CONSTRAINT "PushToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

