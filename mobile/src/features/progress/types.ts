export interface WeeklyProgressSummary {
  remindersFired: number;
  remindersDone: number;
  remindersSnoozed: number;
  remindersSkipped: number;
  checklistsStarted: number;
  checklistsCompleted: number;
  gamesCompleted: number;
  caregiverActionsCount: number;
}

export interface WeeklyProgressResponse {
  weekStart: string;
  summary: WeeklyProgressSummary;
  viewType: 'patient' | 'caregiver';
}

export interface ProgressOverviewResponse {
  nextReminderAt: string | null;
  todayPendingCount: number;
  weeklyReminderCompletionRate: number;
}
