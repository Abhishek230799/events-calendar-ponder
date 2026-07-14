-- AlterEnum
ALTER TYPE "CollabRequestStatus" ADD VALUE 'CANCELLED';

-- AlterTable
ALTER TABLE "CollabRequest" ADD COLUMN     "cancelReason" TEXT;
