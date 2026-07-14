-- CreateEnum
CREATE TYPE "PipelineStatus" AS ENUM ('DRAFT', 'REVIEW', 'SCHEDULED', 'POSTED');

-- CreateTable
CREATE TABLE "PipelineItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "platform" TEXT,
    "status" "PipelineStatus" NOT NULL DEFAULT 'DRAFT',
    "scheduledFor" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PipelineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollabRequest" (
    "id" TEXT NOT NULL,
    "fromId" TEXT NOT NULL,
    "toId" TEXT NOT NULL,
    "eventId" TEXT,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CollabRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PipelineItem_userId_status_idx" ON "PipelineItem"("userId", "status");

-- CreateIndex
CREATE INDEX "PipelineItem_scheduledFor_idx" ON "PipelineItem"("scheduledFor");

-- CreateIndex
CREATE INDEX "CollabRequest_toId_idx" ON "CollabRequest"("toId");

-- AddForeignKey
ALTER TABLE "PipelineItem" ADD CONSTRAINT "PipelineItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollabRequest" ADD CONSTRAINT "CollabRequest_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollabRequest" ADD CONSTRAINT "CollabRequest_toId_fkey" FOREIGN KEY ("toId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
