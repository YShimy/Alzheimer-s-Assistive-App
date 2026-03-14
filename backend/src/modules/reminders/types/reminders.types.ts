/** Reminders module types */

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
  priority: number;
  linkedChecklistTemplateId: string | null;
  snoozeEnabled: boolean;
  defaultSnoozeMinutes: number;
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
  createdAt: string;
}
