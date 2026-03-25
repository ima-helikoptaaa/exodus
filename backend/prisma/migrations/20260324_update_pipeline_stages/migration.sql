-- Migrate existing stage values to new ones before altering enum
UPDATE "applications" SET "stage" = 'APPLIED' WHERE "stage" = 'PHONE_SCREEN';
UPDATE "applications" SET "stage" = 'APPLIED' WHERE "stage" = 'TECHNICAL_INTERVIEW';
UPDATE "applications" SET "stage" = 'APPLIED' WHERE "stage" = 'ONSITE';

-- AlterEnum
ALTER TYPE "PipelineStage" RENAME VALUE 'PHONE_SCREEN' TO 'INTRODUCTORY_CALL';
ALTER TYPE "PipelineStage" RENAME VALUE 'TECHNICAL_INTERVIEW' TO 'ROUND_1';
ALTER TYPE "PipelineStage" RENAME VALUE 'ONSITE' TO 'ROUND_2';

-- Add new values
ALTER TYPE "PipelineStage" ADD VALUE IF NOT EXISTS 'ROUND_3';
ALTER TYPE "PipelineStage" ADD VALUE IF NOT EXISTS 'ROUND_4';
ALTER TYPE "PipelineStage" ADD VALUE IF NOT EXISTS 'ROUND_5';
