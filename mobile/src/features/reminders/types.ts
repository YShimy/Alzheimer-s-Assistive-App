/** Reminders feature types - Redesigned for simple vs guided reminders */

export type ReminderType = 'simple' | 'guided' | 'game_session';
export type PriorityLevel = 'normal' | 'high' | 'critical';

export interface LinkedChecklistSummary {
  id: string;
  title: string;
  stepCount: number;
  category: string;
}

export interface VisualCueSummary {
  assetId: string;
  url: string;
  thumbnailUrl?: string;
}

export interface Reminder {
  id: string;
  patientUserId: string;
  title: string;
  category: string;
  scheduledTime: string;
  repeatRule: any | null;
  startDate: string;
  endDate: string | null;
  daysOfWeek: number[];
  description: string | null;
  // Redesigned: priority as enum instead of number
  priority: PriorityLevel;
  // Redesigned: reminder type (simple vs guided)
  reminderType: ReminderType;
  // Redesigned: linked checklist for guided reminders
  linkedChecklistTemplateId: string | null;
  linkedChecklist?: LinkedChecklistSummary | null;
  // Game session linked
  gameType: string | null;
  // Redesigned: optional visual cue
  visualCueAssetId: string | null;
  visualCue?: VisualCueSummary | null;
  // Native phone alarm for critical reminders
  nativeAlarmEnabled: boolean;
  snoozeEnabled: boolean;
  defaultSnoozeMinutes: number;
  isActive: boolean;
  archivedAt: string | null;
  createdByUserId: string;
  lastEditedByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReminderInput {
  title: string;
  category?: string;
  scheduledTime: string;
  startDate: string;
  endDate?: string;
  daysOfWeek?: number[];
  description?: string;
  // Redesigned: priority as enum
  priority?: PriorityLevel;
  // Redesigned: reminder type
  reminderType?: ReminderType;
  // Redesigned: linked checklist for guided reminders
  linkedChecklistTemplateId?: string;
  // Game session linked
  gameType?: string;
  // Redesigned: optional visual cue
  visualCueAssetId?: string;
  snoozeEnabled?: boolean;
  defaultSnoozeMinutes?: number;
  // Native phone alarm for critical reminders
  nativeAlarmEnabled?: boolean;
}

export interface UpdateReminderInput extends Partial<CreateReminderInput> {
  isActive?: boolean;
}

export interface ReminderEvent {
  id: string;
  reminderId: string;
  patientUserId: string;
  eventType: string;
  scheduledFor: string | null;
  timestamp: string;
  actorUserId: string;
  actorRole: string;
  source: string;
  actionValue: any | null;
  createdAt: string;
}

// Redesigned: expanded action types for simple vs guided reminders
export interface ReminderActionInput {
  action: 'done' | 'snooze' | 'skip' | 'start_now';
  scheduledFor?: string;
  source?: string;
  // Redesigned: actionValue now supports checklistRunId for guided reminders
  actionValue?: {
    snoozeDurationMinutes?: number;
    checklistRunId?: string;
    checklistTemplateId?: string;
  };
  reasonCode?: string;
}

// Redesigned: Escalation types
export interface EscalationEvent {
  id: string;
  patientUserId: string;
  reminderId: string;
  eventType: 'high_priority_skipped' | 'critical_skipped' | 'repeated_skip' | 'guided_not_started';
  triggeredAt: string;
  reason: string;
  acknowledged: boolean;
}
