import { z } from 'zod';

export const ALLOWED_EVENT_NAMES = [
  'onboarding_started',
  'onboarding_completed',
  'language_selected',
  'caregiver_link_initiated',
  'caregiver_linked',
  'caregiver_link_revoked',
  'notification_permission_result',
  'first_reminder_created',
  'reminder_created',
  'reminder_edited',
  'reminder_fired',
  'reminder_done',
  'reminder_snoozed',
  'reminder_skipped',
  'reminder_dismissed',
  'reminder_deactivated',
  'reminder_reactivated',
  'checklist_started',
  'checklist_step_completed',
  'checklist_completed',
  'checklist_abandoned',
  'game_started',
  'game_completed',
  'game_quit',
  'progress_viewed',
  'progress_filter_changed',
  'progress_export_requested',
  'help_opened',
  'help_topic_viewed',
  'error_occurred',
  'sync_failed',
  'notification_schedule_failed'
] as const;

export const eventPayloadSchema = z.object({
  eventName: z.enum(ALLOWED_EVENT_NAMES, {
    message: 'Invalid or unsupported eventName'
  }),
  occurredAt: z.string().datetime().optional(),
  patientUserId: z.string().optional(),
  actorRole: z.enum(['patient', 'caregiver', 'admin', 'system']).optional(),
  sessionId: z.string().optional(),
  screenName: z.string().optional(),
  source: z.string().optional(),
  appVersion: z.string().optional(),
  platform: z.string().optional(),
  language: z.string().optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
});

export const batchEventsSchema = z.object({
  events: z.array(eventPayloadSchema).min(1).max(100),
});

export const clientErrorSchema = z.object({
  screenName: z.string().optional(),
  errorCode: z.string(),
  actionAttempted: z.string().optional(),
  recoverable: z.boolean().optional(),
});
