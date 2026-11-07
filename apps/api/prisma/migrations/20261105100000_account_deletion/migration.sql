-- A deleted account leaves its trips and invitation links in place.
ALTER TABLE "Trip" DROP CONSTRAINT "Trip_createdById_fkey";
ALTER TABLE "Trip" ALTER COLUMN "createdById" DROP NOT NULL;
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Invitation" DROP CONSTRAINT "Invitation_createdById_fkey";
ALTER TABLE "Invitation" ALTER COLUMN "createdById" DROP NOT NULL;
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
