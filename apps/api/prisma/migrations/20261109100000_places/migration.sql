-- AlterTable
ALTER TABLE "Idea" ADD COLUMN     "placeAddress" TEXT,
ADD COLUMN     "placeId" TEXT,
ADD COLUMN     "placeLat" DOUBLE PRECISION,
ADD COLUMN     "placeLng" DOUBLE PRECISION,
ADD COLUMN     "placeRefreshedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "placeAddress" TEXT,
ADD COLUMN     "placeId" TEXT,
ADD COLUMN     "placeLat" DOUBLE PRECISION,
ADD COLUMN     "placeLng" DOUBLE PRECISION,
ADD COLUMN     "placeRefreshedAt" TIMESTAMP(3);
