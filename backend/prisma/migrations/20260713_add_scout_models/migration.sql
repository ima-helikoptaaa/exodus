-- AlterTable: add match scoring fields to applications
ALTER TABLE "applications" ADD COLUMN "matchScore" INTEGER;
ALTER TABLE "applications" ADD COLUMN "matchReasons" TEXT;

-- CreateIndex
CREATE INDEX "applications_matchScore_idx" ON "applications"("matchScore");

-- CreateTable: scout_runs
CREATE TABLE "scout_runs" (
    "id" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "companiesChecked" INTEGER NOT NULL DEFAULT 0,
    "jobsScanned" INTEGER NOT NULL DEFAULT 0,
    "jobsAdded" INTEGER NOT NULL DEFAULT 0,
    "jobsSkipped" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'running',
    "summary" TEXT,

    CONSTRAINT "scout_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable: scout_logs
CREATE TABLE "scout_logs" (
    "id" TEXT NOT NULL,
    "scoutRunId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "jobUrl" TEXT,
    "location" TEXT,
    "action" TEXT NOT NULL,
    "reason" TEXT,
    "matchScore" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scout_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "scout_logs_scoutRunId_idx" ON "scout_logs"("scoutRunId");
CREATE INDEX "scout_logs_action_idx" ON "scout_logs"("action");

-- AddForeignKey
ALTER TABLE "scout_logs" ADD CONSTRAINT "scout_logs_scoutRunId_fkey" FOREIGN KEY ("scoutRunId") REFERENCES "scout_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
