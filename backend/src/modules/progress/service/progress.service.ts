import { prisma } from '../../../shared/db/prisma.js';

export class ProgressService {
  async getWeeklyProgress(patientId: string, role: 'patient' | 'caregiver') {
    const now = new Date();
    // Start of week (Sunday 00:00:00)
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const [
      remindersFired,
      remindersDone,
      remindersSnoozed,
      remindersSkipped,
      checklistsStarted,
      checklistsCompleted,
      gamesCompleted,
      caregiverEvents
    ] = await Promise.all([
      prisma.reminderEvent.count({ where: { patientUserId: patientId, timestamp: { gte: weekStart }, eventType: 'FIRED' } }),
      prisma.reminderEvent.count({ where: { patientUserId: patientId, timestamp: { gte: weekStart }, eventType: 'DONE' } }),
      prisma.reminderEvent.count({ where: { patientUserId: patientId, timestamp: { gte: weekStart }, eventType: 'SNOOZED' } }),
      prisma.reminderEvent.count({ where: { patientUserId: patientId, timestamp: { gte: weekStart }, eventType: 'SKIPPED' } }),
      prisma.checklistRun.count({ where: { patientUserId: patientId, createdAt: { gte: weekStart } } }),
      prisma.checklistRun.count({ where: { patientUserId: patientId, createdAt: { gte: weekStart }, status: 'COMPLETED' } }),
      prisma.gameSession.count({ where: { patientUserId: patientId, startedAt: { gte: weekStart }, completed: true } }),
      prisma.reminderEvent.count({ where: { patientUserId: patientId, timestamp: { gte: weekStart }, actorRole: 'caregiver' } }),
    ]);

    return {
      weekStart: weekStart.toISOString().split('T')[0],
      summary: {
        remindersFired,
        remindersDone,
        remindersSnoozed,
        remindersSkipped,
        checklistsStarted,
        checklistsCompleted,
        gamesCompleted,
        caregiverActionsCount: caregiverEvents
      },
      viewType: role
    };
  }

  async getProgressOverview(patientId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);

    const nextReminder = await prisma.reminderEvent.findFirst({
      where: {
        patientUserId: patientId,
        scheduledFor: { gte: new Date() },
        eventType: 'FIRED'
      },
      orderBy: { scheduledFor: 'asc' }
    });

    const todayPendingCount = await prisma.reminderEvent.count({
      where: {
        patientUserId: patientId,
        scheduledFor: { gte: today },
        eventType: 'FIRED'
      }
    });

    const weeklyFired = await prisma.reminderEvent.count({
      where: { patientUserId: patientId, timestamp: { gte: weekStart }, eventType: 'FIRED' }
    });
    
    const weeklyDone = await prisma.reminderEvent.count({
      where: { patientUserId: patientId, timestamp: { gte: weekStart }, eventType: 'DONE' }
    });

    const weeklyReminderCompletionRate = weeklyFired > 0 ? (weeklyDone / weeklyFired) : 0;

    return {
      nextReminderAt: nextReminder?.scheduledFor?.toISOString() || null,
      todayPendingCount,
      weeklyReminderCompletionRate
    };
  }
}

export const progressService = new ProgressService();
