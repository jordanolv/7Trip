-- CreateEnum
CREATE TYPE "AvatarColor" AS ENUM ('sage', 'sky', 'sand', 'peach', 'lilac', 'rose', 'periwinkle', 'stone');

-- AlterTable
ALTER TABLE "Participant" ADD COLUMN     "avatarColor" "AvatarColor";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "avatarColor" "AvatarColor";

