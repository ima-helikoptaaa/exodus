-- CreateTable
CREATE TABLE "seen_jobs" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "location" TEXT,
    "source" TEXT,
    "jobHash" TEXT,
    "firstSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeen" TIMESTAMP(3) NOT NULL,
    "rejected" BOOLEAN NOT NULL DEFAULT false,
    "rejectedAt" TIMESTAMP(3),

    CONSTRAINT "seen_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "seen_jobs_url_key" ON "seen_jobs"("url");

-- CreateIndex
CREATE INDEX "seen_jobs_jobHash_idx" ON "seen_jobs"("jobHash");
