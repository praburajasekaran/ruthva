-- AlterTable
ALTER TABLE "Clinic" ADD COLUMN "externalSubdomain" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Clinic_externalSubdomain_key" ON "Clinic"("externalSubdomain");
