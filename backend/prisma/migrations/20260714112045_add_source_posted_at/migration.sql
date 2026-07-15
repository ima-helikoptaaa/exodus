-- AlterTable
ALTER TABLE "applications" ADD COLUMN     "postedAt" TIMESTAMP(3),
ADD COLUMN     "source" TEXT;

-- CreateIndex
CREATE INDEX "applications_postedAt_idx" ON "applications"("postedAt");
