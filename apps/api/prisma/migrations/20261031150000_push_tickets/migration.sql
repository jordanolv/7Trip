-- CreateTable
CREATE TABLE "PushTicket" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushTicket_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PushTicket_createdAt_idx" ON "PushTicket"("createdAt");

