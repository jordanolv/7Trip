-- A trip now has an ordered list of destinations instead of a single free-text one.

-- CreateTable
CREATE TABLE "TripDestination" (
    "id" UUID NOT NULL,
    "tripId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "TripDestination_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TripDestination_tripId_position_idx" ON "TripDestination"("tripId", "position");

-- AddForeignKey
ALTER TABLE "TripDestination" ADD CONSTRAINT "TripDestination_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Keep existing destinations as the first stop of their trip.
INSERT INTO "TripDestination" ("id", "tripId", "name", "position")
SELECT gen_random_uuid(), "id", "destination", 0
FROM "Trip"
WHERE "destination" IS NOT NULL AND btrim("destination") <> '';

-- AlterTable
ALTER TABLE "Trip" DROP COLUMN "destination";
