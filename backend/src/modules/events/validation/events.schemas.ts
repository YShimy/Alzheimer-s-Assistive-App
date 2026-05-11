import { z } from 'zod';

export const ALLOWED_EVENT_NAMES = [
  // ─── Core / Onboarding ───────────────────────────────────
  'onboarding_started',
  'onboarding_completed',
  'language_selected',
  // ─── Caregiver / Care Links ──────────────────────────────
  'caregiver_link_initiated',
  'caregiver_linked',
  'caregiver_link_revoked',
  // ─── Notifications ──────────────────────────────────────
  'notification_permission_result',
  'notification_schedule_failed',
  // ─── Reminders ───────────────────────────────────────────
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
  // ─── Checklists ──────────────────────────────────────────
  'checklist_started',
  'checklist_step_completed',
  'checklist_completed',
  'checklist_abandoned',
  // ─── Games (generic) ─────────────────────────────────────
  'game_started',
  'game_completed',
  'game_quit',
  'game_opened',
  'game_instructions_viewed',
  'game_session_started',
  'game_progress_chart_viewed',
  // ─── Associative Memory Match ────────────────────────────
  'memory_match_study_started',
  'memory_match_recall_started',
  'memory_match_answered',
  'memory_match_session_completed',
  'memory_match_session_abandoned',
  'memory_match_level_advanced',
  'memory_match_level_regressed',
  // ─── Spaced Retrieval Orientation Practice ───────────────
  'spaced_retrieval_session_started',
  'spaced_retrieval_question_shown',
  'spaced_retrieval_answered',
  'spaced_retrieval_cue_used',
  'spaced_retrieval_session_completed',
  'spaced_retrieval_session_abandoned',
  'spaced_retrieval_item_created',
  'spaced_retrieval_item_updated',
  'spaced_retrieval_item_archived',
  'sr_item_mastered',
  'sr_item_needs_review',
  'game_reminder_completed',
  // ─── Legacy (deprecated — kept for analytics continuity) ─
  'level_preview_started',
  'level_started',
  'level_completed',
  'level_failed',
  'tile_selected',
  'invalid_move_attempted',
  'session_paused',
  'session_resumed',
  'session_completed',
  'session_abandoned',
  'routine_sequence_instructions_viewed',
  'routine_sequence_session_started',
  'routine_sequence_study_viewed',
  'routine_sequence_step_answered',
  'routine_sequence_prompt_shown',
  'routine_sequence_level_completed',
  'routine_sequence_session_completed',
  'routine_sequence_session_abandoned',
  // ─── Progress ────────────────────────────────────────────
  'progress_viewed',
  'progress_filter_changed',
  'progress_export_requested',
  // ─── Help ────────────────────────────────────────────────
  'help_opened',
  'help_topic_viewed',
  // ─── Errors / Sync ───────────────────────────────────────
  'error_occurred',
  'sync_failed',
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
