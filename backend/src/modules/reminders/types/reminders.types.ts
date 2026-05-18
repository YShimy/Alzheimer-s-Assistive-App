/** Reminders module types - Redesigned for simple vs guided reminders */

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

export interface ReminderResponse {
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
  // Redesigned: optional linked checklist
  linkedChecklistTemplateId: string | null;
  linkedChecklist?: LinkedChecklistSummary | null;
  // Redesigned: optional visual cue
  visualCueAssetId: string | null;
  visualCue?: VisualCueSummary | null;
  gameType?: string | null;
  snoozeEnabled: boolean;
  defaultSnoozeMinutes: number;
  nativeAlarmEnabled: boolean;
  isActive: boolean;
  archivedAt: string | null;
  createdByUserId: string;
  lastEditedByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReminderEventResponse {
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
  optionalReasonCode: string | null;
  // Redesigned: escalation tracking
  escalationTriggered: boolean;
  escalationReason: string | null;
  linkedChecklistRunId: string | null;
  createdAt: string;
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
  acknowledgedAt?: string;
}
