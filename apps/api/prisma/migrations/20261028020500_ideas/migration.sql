-- CreateEnum
CREATE TYPE "IdeaCategory" AS ENUM ('ACTIVITY', 'FOOD', 'WALK', 'BEACH', 'CULTURE', 'NIGHTLIFE', 'OTHER');

-- CreateEnum
CREATE TYPE "IdeaStatus" AS ENUM ('PROPOSED', 'KEPT');

-- CreateTable
CREATE TABLE "Idea" (
    "id" UUID NOT NULL,
    "tripId" UUID NOT NULL,
    "authorId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "category" "IdeaCategory",
    "place" TEXT,
    "url" TEXT,
    "description" TEXT,
    "cost" TEXT,
    "status" "IdeaStatus" NOT NULL DEFAULT 'PROPOSED',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Idea_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Idea_tripId_createdAt_idx" ON "Idea"("tripId", "createdAt");

-- CreateIndex
CREATE INDEX "Idea_authorId_idx" ON "Idea"("authorId");

-- AddForeignKey
ALTER TABLE "Idea" ADD CONSTRAINT "Idea_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Idea" ADD CONSTRAINT "Idea_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

