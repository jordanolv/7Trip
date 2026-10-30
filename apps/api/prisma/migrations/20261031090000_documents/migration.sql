-- CreateEnum
CREATE TYPE "DocumentKind" AS ENUM ('FILE', 'LINK');

-- CreateEnum
CREATE TYPE "DocumentCategory" AS ENUM ('TRANSPORT', 'LODGING', 'ACTIVITY', 'OTHER');

-- CreateEnum
CREATE TYPE "DocumentVisibility" AS ENUM ('PRIVATE', 'SHARED');

-- CreateTable
CREATE TABLE "Document" (
    "id" UUID NOT NULL,
    "tripId" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "kind" "DocumentKind" NOT NULL,
    "category" "DocumentCategory" NOT NULL DEFAULT 'OTHER',
    "date" DATE,
    "eventId" UUID,
    "visibility" "DocumentVisibility" NOT NULL DEFAULT 'PRIVATE',
    "bookingRef" TEXT,
    "url" TEXT,
    "storageKey" TEXT,
    "mime" TEXT,
    "sizeBytes" INTEGER,
    "fileName" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Document_storageKey_key" ON "Document"("storageKey");

-- CreateIndex
CREATE INDEX "Document_tripId_date_idx" ON "Document"("tripId", "date");

-- CreateIndex
CREATE INDEX "Document_ownerId_idx" ON "Document"("ownerId");

-- CreateIndex
CREATE INDEX "Document_eventId_idx" ON "Document"("eventId");

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

