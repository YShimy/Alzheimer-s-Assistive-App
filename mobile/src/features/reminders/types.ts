/** Reminders feature types */
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
  priority: number;
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
  priority?: number;
  snoozeEnabled?: boolean;
  defaultSnoozeMinutes?: number;
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

export interface ReminderActionInput {
  action: 'done' | 'snooze' | 'skip';
  scheduledFor?: string;
  source?: string;
  actionValue?: any;
  reasonCode?: string;
}
