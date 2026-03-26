import { notifications } from '../../infrastructure/notifications/notifications';
import type { Reminder } from './types';

/**
 * Compute the next occurrences of a reminder based on its schedule.
 */
function getNextOccurrences(reminder: Reminder, daysAhead: number): Date[] {
  const dates: Date[] = [];
  const now = new Date();
  
  if (!reminder.scheduledTime) return dates;
  const [hours, minutes] = reminder.scheduledTime.split(':').map(Number);

  // Determine active days (0 = Sunday, 1 = Monday, etc.)
  const activeDays: number[] = (reminder.daysOfWeek && reminder.daysOfWeek.length > 0)
    ? reminder.daysOfWeek
    : [0, 1, 2, 3, 4, 5, 6];

  for (let i = 0; i < daysAhead; i++) {
    const candidate = new Date(now);
    candidate.setDate(now.getDate() + i);
    candidate.setHours(hours!, minutes!, 0, 0);

    if (activeDays.includes(candidate.getDay()) && candidate > now) {
      if (!reminder.endDate || new Date(reminder.endDate) >= candidate) {
        if (!reminder.startDate || new Date(reminder.startDate) <= candidate) {
          dates.push(candidate);
        }
      }
    }
  }
  return dates;
}

export const reminderScheduler = {
  /**
   * Keep local notifications entirely in sync with the fetched reminders list.
   * Cancel-all + reschedule-all strategy ensures no stale notifications.
   */
  async syncSchedule(reminders: Reminder[]): Promise<void> {
    try {
      await notifications.cancelAll();

      const activeReminders = reminders.filter(r => r.isActive && !r.archivedAt);

      for (const reminder of activeReminders) {
        const nextOccurrences = getNextOccurrences(reminder, 7); // Schedule next 7 days
        for (const date of nextOccurrences) {
          await notifications.scheduleReminder({
            id: `${reminder.id}_${date.getTime()}`, // unique ID per occurrence
            title: reminder.title,
            body: reminder.description ?? reminder.category,
            scheduledAt: date,
          });
        }
      }
    } catch (err) {
      console.warn('Failed to sync notification schedule', err);
    }
  },

  /**
   * Cancel specific notifications if needed, but usually syncSchedule handles everything 
   * since it clears the slate.
   */
  async cancelReminderNotifications(allActiveReminders: Reminder[]): Promise<void> {
    await this.syncSchedule(allActiveReminders);
  },
};
