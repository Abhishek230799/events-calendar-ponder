-- CreateEnum
CREATE TYPE "CollabRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

-- AlterTable
ALTER TABLE "CollabRequest" ADD COLUMN     "status" "CollabRequestStatus" NOT NULL DEFAULT 'PENDING';
