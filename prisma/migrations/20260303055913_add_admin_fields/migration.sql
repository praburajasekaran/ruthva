-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "EventType" ADD VALUE 'adherence_check_failed';
ALTER TYPE "EventType" ADD VALUE 'reminder_failed';
ALTER TYPE "EventType" ADD VALUE 'recovery_message_failed';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "deactivatedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "User_deactivatedAt_idx" ON "User"("deactivatedAt");
