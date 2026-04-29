/*
  Warnings:

  - The values [NOT_STARTED] on the enum `ChecklistRunStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [EXERCISE,HYGIENE,SOCIAL,OTHER] on the enum `ReminderCategory` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `caregiverId` on the `care_links` table. All the data in the column will be lost.
  - You are about to drop the column `patientId` on the `care_links` table. All the data in the column will be lost.
  - You are about to drop the column `patientId` on the `checklist_runs` table. All the data in the column will be lost.
  - You are about to drop the column `progress` on the `checklist_runs` table. All the data in the column will be lost.
  - You are about to drop the column `templateId` on the `checklist_runs` table. All the data in the column will be lost.
  - You are about to drop the column `createdById` on the `checklist_templates` table. All the data in the column will be lost.
  - You are about to drop the column `patientId` on the `checklist_templates` table. All the data in the column will be lost.
  - You are about to drop the column `durationMs` on the `game_sessions` table. All the data in the column will be lost.
  - You are about to drop the column `patientId` on the `game_sessions` table. All the data in the column will be lost.
  - You are about to drop the column `playedAt` on the `game_sessions` table. All the data in the column will be lost.
  - You are about to drop the column `action` on the `reminder_events` table. All the data in the column will be lost.
  - You are about to drop the column `occurredAt` on the `reminder_events` table. All the data in the column will be lost.
  - You are about to drop the column `createdById` on the `reminders` table. All the data in the column will be lost.
  - You are about to drop the column `patientId` on the `reminders` table. All the data in the column will be lost.
  - You are about to drop the column `recurrence` on the `reminders` table. All the data in the column will be lost.
  - You are about to drop the column `scheduledAt` on the `reminders` table. All the data in the column will be lost.
  - Added the required column `caregiverUserId` to the `care_links` table without a default value. This is not possible if the table is not empty.
  - Added the required column `invitedByUserId` to the `care_links` table without a default value. This is not possible if the table is not empty.
  - Added the required column `actorRole` to the `checklist_runs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `actorUserId` to the `checklist_runs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `checklistTemplateId` to the `checklist_runs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `patientUserId` to the `checklist_runs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `checklist_runs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `createdByUserId` to the `checklist_templates` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lastEditedByUserId` to the `checklist_templates` table without a default value. This is not possible if the table is not empty.
  - Added the required column `patientUserId` to the `checklist_templates` table without a default value. This is not possible if the table is not empty.
  - Added the required column `actorRole` to the `game_sessions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `actorUserId` to the `game_sessions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `patientUserId` to the `game_sessions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `actorRole` to the `reminder_events` table without a default value. This is not possible if the table is not empty.
  - Added the required column `actorUserId` to the `reminder_events` table without a default value. This is not possible if the table is not empty.
  - Added the required column `eventType` to the `reminder_events` table without a default value. This is not possible if the table is not empty.
  - Added the required column `patientUserId` to the `reminder_events` table without a default value. This is not possible if the table is not empty.
  - Added the required column `createdByUserId` to the `reminders` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lastEditedByUserId` to the `reminders` table without a default value. This is not possible if the table is not empty.
  - Added the required column `patientUserId` to the `reminders` table without a default value. This is not possible if the table is not empty.
  - Added the required column `scheduledTime` to the `reminders` table without a default value. This is not possible if the table is not empty.
  - Added the required column `startDate` to the `reminders` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ReminderType" AS ENUM ('SIMPLE', 'GUIDED');

-- CreateEnum
CREATE TYPE "PriorityLevel" AS ENUM ('NORMAL', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ChecklistCategory" AS ENUM ('MORNING', 'EVENING', 'HYGIENE', 'MEALS', 'MEDICATION', 'EXERCISE', 'ACTIVITY', 'HOUSEHOLD', 'APPOINTMENTS', 'SOCIAL', 'CUSTOM', 'GENERAL');

-- CreateEnum
CREATE TYPE "ReminderEventType" AS ENUM ('CREATED', 'EDITED', 'FIRED', 'DISMISSED', 'DEACTIVATED', 'REACTIVATED', 'DONE', 'SNOOZED', 'SKIPPED', 'START_NOW', 'GUIDED_REMINDER_STARTED', 'LINKED_CHECKLIST_OPENED', 'LINKED_CHECKLIST_COMPLETED', 'LINKED_CHECKLIST_ABANDONED', 'ESCALATION_TRIGGERED', 'HIGH_PRIORITY_SKIPPED', 'CRITICAL_SKIPPED', 'REPEATED_SKIP_DETECTED');

-- CreateEnum
CREATE TYPE "VerificationPurpose" AS ENUM ('SIGNUP', 'PASSWORD_RESET');

-- CreateEnum
CREATE TYPE "ConsentStatus" AS ENUM ('PENDING', 'GRANTED', 'REVOKED');

-- CreateEnum
CREATE TYPE "ContactSourceType" AS ENUM ('DEVICE_CONTACTS', 'MANUAL');

-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('IMAGE', 'VIDEO');

-- AlterEnum
BEGIN;
CREATE TYPE "ChecklistRunStatus_new" AS ENUM ('STARTED', 'IN_PROGRESS', 'COMPLETED', 'ABANDONED');
ALTER TABLE "public"."checklist_runs" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "checklist_runs" ALTER COLUMN "status" TYPE "ChecklistRunStatus_new" USING ("status"::text::"ChecklistRunStatus_new");
ALTER TYPE "ChecklistRunStatus" RENAME TO "ChecklistRunStatus_old";
ALTER TYPE "ChecklistRunStatus_new" RENAME TO "ChecklistRunStatus";
DROP TYPE "public"."ChecklistRunStatus_old";
ALTER TABLE "checklist_runs" ALTER COLUMN "status" SET DEFAULT 'STARTED';
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "ReminderCategory_new" AS ENUM ('MEDICATION', 'APPOINTMENT', 'TASK', 'HYDRATION', 'MEAL', 'CALL', 'CUSTOM', 'GENERAL');
ALTER TABLE "reminders" ALTER COLUMN "category" TYPE "ReminderCategory_new" USING ("category"::text::"ReminderCategory_new");
ALTER TYPE "ReminderCategory" RENAME TO "ReminderCategory_old";
ALTER TYPE "ReminderCategory_new" RENAME TO "ReminderCategory";
DROP TYPE "public"."ReminderCategory_old";
COMMIT;

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'ADMIN';

-- DropForeignKey
ALTER TABLE "care_links" DROP CONSTRAINT "care_links_caregiverId_fkey";

-- DropForeignKey
ALTER TABLE "care_links" DROP CONSTRAINT "care_links_patientId_fkey";

-- DropForeignKey
ALTER TABLE "checklist_runs" DROP CONSTRAINT "checklist_runs_patientId_fkey";

-- DropForeignKey
ALTER TABLE "checklist_runs" DROP CONSTRAINT "checklist_runs_templateId_fkey";

-- DropForeignKey
ALTER TABLE "checklist_templates" DROP CONSTRAINT "checklist_templates_createdById_fkey";

-- DropForeignKey
ALTER TABLE "checklist_templates" DROP CONSTRAINT "checklist_templates_patientId_fkey";

-- DropForeignKey
ALTER TABLE "game_sessions" DROP CONSTRAINT "game_sessions_patientId_fkey";

-- DropForeignKey
ALTER TABLE "reminders" DROP CONSTRAINT "reminders_createdById_fkey";

-- DropForeignKey
ALTER TABLE "reminders" DROP CONSTRAINT "reminders_patientId_fkey";

-- AlterTable
ALTER TABLE "care_links" DROP COLUMN "caregiverId",
DROP COLUMN "patientId",
ADD COLUMN     "acceptedAt" TIMESTAMP(3),
ADD COLUMN     "caregiverUserId" TEXT NOT NULL,
ADD COLUMN     "invitedByUserId" TEXT NOT NULL,
ADD COLUMN     "patientUserId" TEXT,
ADD COLUMN     "permissions" JSONB NOT NULL DEFAULT '{"canCreateReminders": true, "canEditReminders": true, "canViewProgress": true, "canCreateChecklists": true, "canEditChecklists": true, "canMarkTasksOnBehalf": false}',
ADD COLUMN     "revokedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "checklist_runs" DROP COLUMN "patientId",
DROP COLUMN "progress",
DROP COLUMN "templateId",
ADD COLUMN     "abandonedAt" TIMESTAMP(3),
ADD COLUMN     "actorRole" TEXT NOT NULL,
ADD COLUMN     "actorUserId" TEXT NOT NULL,
ADD COLUMN     "checklistTemplateId" TEXT NOT NULL,
ADD COLUMN     "completedStepsCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "durationSeconds" INTEGER,
ADD COLUMN     "lastStepIndexReached" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "patientUserId" TEXT NOT NULL,
ADD COLUMN     "startedFrom" TEXT NOT NULL DEFAULT 'home',
ADD COLUMN     "stepResults" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "totalStepsCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'STARTED';

-- AlterTable
ALTER TABLE "checklist_templates" DROP COLUMN "createdById",
DROP COLUMN "patientId",
ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "category" "ChecklistCategory" NOT NULL DEFAULT 'GENERAL',
ADD COLUMN     "createdByUserId" TEXT NOT NULL,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "estimatedDurationMinutes" INTEGER,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "lastEditedByUserId" TEXT NOT NULL,
ADD COLUMN     "patientUserId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "game_sessions" DROP COLUMN "durationMs",
DROP COLUMN "patientId",
DROP COLUMN "playedAt",
ADD COLUMN     "actorRole" TEXT NOT NULL,
ADD COLUMN     "actorUserId" TEXT NOT NULL,
ADD COLUMN     "completed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "difficultyLevel" TEXT NOT NULL DEFAULT 'easy',
ADD COLUMN     "durationSeconds" INTEGER,
ADD COLUMN     "highestTierReached" INTEGER,
ADD COLUMN     "levelsFailed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "levelsPlayed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "levelsSucceeded" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "patientUserId" TEXT NOT NULL,
ADD COLUMN     "quitEarly" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'home',
ADD COLUMN     "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "reminder_events" DROP COLUMN "action",
DROP COLUMN "occurredAt",
ADD COLUMN     "actionValue" JSONB,
ADD COLUMN     "actorRole" TEXT NOT NULL,
ADD COLUMN     "actorUserId" TEXT NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "escalationReason" TEXT,
ADD COLUMN     "escalationTriggered" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "eventType" "ReminderEventType" NOT NULL,
ADD COLUMN     "linkedChecklistRunId" TEXT,
ADD COLUMN     "optionalReasonCode" TEXT,
ADD COLUMN     "patientUserId" TEXT NOT NULL,
ADD COLUMN     "scheduledFor" TIMESTAMP(3),
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'system_scheduler',
ADD COLUMN     "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "reminders" DROP COLUMN "createdById",
DROP COLUMN "patientId",
DROP COLUMN "recurrence",
DROP COLUMN "scheduledAt",
ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "createdByUserId" TEXT NOT NULL,
ADD COLUMN     "daysOfWeek" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN     "defaultSnoozeMinutes" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "endDate" TIMESTAMP(3),
ADD COLUMN     "lastEditedByUserId" TEXT NOT NULL,
ADD COLUMN     "linkedChecklistTemplateId" TEXT,
ADD COLUMN     "patientUserId" TEXT NOT NULL,
ADD COLUMN     "priority" "PriorityLevel" NOT NULL DEFAULT 'NORMAL',
ADD COLUMN     "reminderType" "ReminderType" NOT NULL DEFAULT 'SIMPLE',
ADD COLUMN     "repeatRule" JSONB,
ADD COLUMN     "scheduledTime" TEXT NOT NULL,
ADD COLUMN     "snoozeEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "startDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "visualCueAssetId" TEXT,
ALTER COLUMN "category" SET DEFAULT 'TASK';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "accessibilitySettings" JSONB NOT NULL DEFAULT '{"textSize": "medium", "highContrast": false, "audioCuesEnabled": false}',
ADD COLUMN     "age" INTEGER,
ADD COLUMN     "emailVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "language" TEXT NOT NULL DEFAULT 'en',
ADD COLUMN     "lastSeenAt" TIMESTAMP(3),
ADD COLUMN     "passwordHash" TEXT,
ADD COLUMN     "preferredNotificationMode" TEXT NOT NULL DEFAULT 'push',
ADD COLUMN     "pushToken" TEXT,
ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'UTC',
ALTER COLUMN "googleId" DROP NOT NULL,
ALTER COLUMN "role" SET DEFAULT 'PATIENT';

-- DropEnum
DROP TYPE "ReminderAction";

-- CreateTable
CREATE TABLE "email_verifications" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "lastSentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "purpose" "VerificationPurpose" NOT NULL DEFAULT 'SIGNUP',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_level_results" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "levelIndex" INTEGER NOT NULL,
    "difficultyTier" INTEGER NOT NULL,
    "gridRows" INTEGER NOT NULL,
    "gridCols" INTEGER NOT NULL,
    "bombCount" INTEGER NOT NULL,
    "previewDurationMs" INTEGER NOT NULL,
    "solveTimeMs" INTEGER,
    "success" BOOLEAN NOT NULL,
    "scoreDelta" INTEGER NOT NULL DEFAULT 0,
    "pathLength" INTEGER NOT NULL DEFAULT 0,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "game_level_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_events" (
    "id" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "patientUserId" TEXT,
    "actorUserId" TEXT,
    "actorRole" TEXT,
    "sessionId" TEXT,
    "screenName" TEXT,
    "source" TEXT,
    "appVersion" TEXT,
    "platform" TEXT,
    "language" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_support_consents" (
    "id" TEXT NOT NULL,
    "patientUserId" TEXT NOT NULL,
    "status" "ConsentStatus" NOT NULL DEFAULT 'PENDING',
    "grantedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contact_support_consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_contacts" (
    "id" TEXT NOT NULL,
    "patientUserId" TEXT NOT NULL,
    "sourceType" "ContactSourceType" NOT NULL DEFAULT 'DEVICE_CONTACTS',
    "sourceContactId" TEXT,
    "displayName" TEXT NOT NULL,
    "normalizedPhones" JSONB,
    "normalizedEmails" JSONB,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSyncedAt" TIMESTAMP(3),
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_memos" (
    "id" TEXT NOT NULL,
    "patientContactId" TEXT NOT NULL,
    "patientUserId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "relationLabel" TEXT,
    "shortMemo" TEXT,
    "photoAssetId" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "patientFavorite" BOOLEAN NOT NULL DEFAULT false,
    "caregiverFavorite" BOOLEAN NOT NULL DEFAULT false,
    "patientPriorityRank" INTEGER,
    "caregiverPriorityRank" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contact_memos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_assets" (
    "id" TEXT NOT NULL,
    "ownerUserId" TEXT,
    "uploadedByUserId" TEXT NOT NULL,
    "assetType" "AssetType" NOT NULL DEFAULT 'IMAGE',
    "storageProvider" TEXT NOT NULL DEFAULT 'local',
    "storageKey" TEXT NOT NULL,
    "publicUrl" TEXT,
    "mimeType" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "durationSeconds" INTEGER,
    "thumbnailUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "email_verifications_email_idx" ON "email_verifications"("email");

-- CreateIndex
CREATE INDEX "email_verifications_email_purpose_idx" ON "email_verifications"("email", "purpose");

-- CreateIndex
CREATE INDEX "email_verifications_expiresAt_idx" ON "email_verifications"("expiresAt");

-- CreateIndex
CREATE INDEX "game_level_results_sessionId_idx" ON "game_level_results"("sessionId");

-- CreateIndex
CREATE INDEX "game_level_results_difficultyTier_idx" ON "game_level_results"("difficultyTier");

-- CreateIndex
CREATE INDEX "analytics_events_eventName_idx" ON "analytics_events"("eventName");

-- CreateIndex
CREATE INDEX "analytics_events_patientUserId_idx" ON "analytics_events"("patientUserId");

-- CreateIndex
CREATE INDEX "analytics_events_occurredAt_idx" ON "analytics_events"("occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "contact_support_consents_patientUserId_key" ON "contact_support_consents"("patientUserId");

-- CreateIndex
CREATE INDEX "patient_contacts_patientUserId_idx" ON "patient_contacts"("patientUserId");

-- CreateIndex
CREATE INDEX "patient_contacts_sourceContactId_idx" ON "patient_contacts"("sourceContactId");

-- CreateIndex
CREATE INDEX "contact_memos_patientContactId_idx" ON "contact_memos"("patientContactId");

-- CreateIndex
CREATE INDEX "contact_memos_patientUserId_idx" ON "contact_memos"("patientUserId");

-- CreateIndex
CREATE INDEX "media_assets_ownerUserId_idx" ON "media_assets"("ownerUserId");

-- CreateIndex
CREATE INDEX "care_links_caregiverUserId_idx" ON "care_links"("caregiverUserId");

-- CreateIndex
CREATE INDEX "care_links_patientUserId_idx" ON "care_links"("patientUserId");

-- CreateIndex
CREATE INDEX "care_links_inviteCode_idx" ON "care_links"("inviteCode");

-- CreateIndex
CREATE INDEX "care_links_status_idx" ON "care_links"("status");

-- CreateIndex
CREATE INDEX "checklist_runs_checklistTemplateId_idx" ON "checklist_runs"("checklistTemplateId");

-- CreateIndex
CREATE INDEX "checklist_runs_patientUserId_idx" ON "checklist_runs"("patientUserId");

-- CreateIndex
CREATE INDEX "checklist_runs_status_idx" ON "checklist_runs"("status");

-- CreateIndex
CREATE INDEX "checklist_templates_patientUserId_idx" ON "checklist_templates"("patientUserId");

-- CreateIndex
CREATE INDEX "checklist_templates_isActive_idx" ON "checklist_templates"("isActive");

-- CreateIndex
CREATE INDEX "game_sessions_patientUserId_idx" ON "game_sessions"("patientUserId");

-- CreateIndex
CREATE INDEX "game_sessions_gameType_idx" ON "game_sessions"("gameType");

-- CreateIndex
CREATE INDEX "game_sessions_startedAt_idx" ON "game_sessions"("startedAt");

-- CreateIndex
CREATE INDEX "reminder_events_reminderId_idx" ON "reminder_events"("reminderId");

-- CreateIndex
CREATE INDEX "reminder_events_patientUserId_idx" ON "reminder_events"("patientUserId");

-- CreateIndex
CREATE INDEX "reminder_events_eventType_idx" ON "reminder_events"("eventType");

-- CreateIndex
CREATE INDEX "reminder_events_timestamp_idx" ON "reminder_events"("timestamp");

-- CreateIndex
CREATE INDEX "reminder_events_escalationTriggered_idx" ON "reminder_events"("escalationTriggered");

-- CreateIndex
CREATE INDEX "reminders_patientUserId_idx" ON "reminders"("patientUserId");

-- CreateIndex
CREATE INDEX "reminders_patientUserId_isActive_idx" ON "reminders"("patientUserId", "isActive");

-- CreateIndex
CREATE INDEX "reminders_category_idx" ON "reminders"("category");

-- CreateIndex
CREATE INDEX "reminders_createdByUserId_idx" ON "reminders"("createdByUserId");

-- CreateIndex
CREATE INDEX "reminders_priority_idx" ON "reminders"("priority");

-- CreateIndex
CREATE INDEX "reminders_reminderType_idx" ON "reminders"("reminderType");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_googleId_idx" ON "users"("googleId");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- AddForeignKey
ALTER TABLE "care_links" ADD CONSTRAINT "care_links_caregiverUserId_fkey" FOREIGN KEY ("caregiverUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "care_links" ADD CONSTRAINT "care_links_patientUserId_fkey" FOREIGN KEY ("patientUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "care_links" ADD CONSTRAINT "care_links_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_patientUserId_fkey" FOREIGN KEY ("patientUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_lastEditedByUserId_fkey" FOREIGN KEY ("lastEditedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_linkedChecklistTemplateId_fkey" FOREIGN KEY ("linkedChecklistTemplateId") REFERENCES "checklist_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_visualCueAssetId_fkey" FOREIGN KEY ("visualCueAssetId") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reminder_events" ADD CONSTRAINT "reminder_events_patientUserId_fkey" FOREIGN KEY ("patientUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reminder_events" ADD CONSTRAINT "reminder_events_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_templates" ADD CONSTRAINT "checklist_templates_patientUserId_fkey" FOREIGN KEY ("patientUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_templates" ADD CONSTRAINT "checklist_templates_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_templates" ADD CONSTRAINT "checklist_templates_lastEditedByUserId_fkey" FOREIGN KEY ("lastEditedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_runs" ADD CONSTRAINT "checklist_runs_checklistTemplateId_fkey" FOREIGN KEY ("checklistTemplateId") REFERENCES "checklist_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_runs" ADD CONSTRAINT "checklist_runs_patientUserId_fkey" FOREIGN KEY ("patientUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_runs" ADD CONSTRAINT "checklist_runs_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_sessions" ADD CONSTRAINT "game_sessions_patientUserId_fkey" FOREIGN KEY ("patientUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_sessions" ADD CONSTRAINT "game_sessions_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_level_results" ADD CONSTRAINT "game_level_results_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "game_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_patientUserId_fkey" FOREIGN KEY ("patientUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_support_consents" ADD CONSTRAINT "contact_support_consents_patientUserId_fkey" FOREIGN KEY ("patientUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_contacts" ADD CONSTRAINT "patient_contacts_patientUserId_fkey" FOREIGN KEY ("patientUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_memos" ADD CONSTRAINT "contact_memos_patientContactId_fkey" FOREIGN KEY ("patientContactId") REFERENCES "patient_contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_memos" ADD CONSTRAINT "contact_memos_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_memos" ADD CONSTRAINT "contact_memos_photoAssetId_fkey" FOREIGN KEY ("photoAssetId") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
