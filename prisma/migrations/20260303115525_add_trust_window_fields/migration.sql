-- AlterTable
ALTER TABLE "Journey" ADD COLUMN     "trustWindowActive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "trustWindowStartDate" DATE;
