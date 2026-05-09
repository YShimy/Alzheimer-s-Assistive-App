/**
 * Notification Service
 *
 * Improvements over the original:
 *  - Multi-device: fetches all Device records (not just one pushToken on User)
 *  - Background delivery: enqueues into notificationQueue (non-blocking)
 *  - Persistent inbox: saves every notification to the DB Notification table
 *  - Localized: builds titles/bodies in each caregiver's preferred language (ar/en)
 *  - Dead-token cleanup: handled by receiptChecker CRON (Phase 3)
 */

import { prisma } from '../../../shared/db/prisma.js';
import { enqueuePushMessages } from '../../../shared/queue/notificationQueue.js';
import type { PushMessage } from '../../../shared/queue/notificationQueue.js';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface EscalationNotificationData {
  patientId: string;
  patientName: string;
  reminderId: string;
  reminderTitle: string;
  escalationReason: string;
  priority: string;
}

interface CaregiverWithDevices {
  id: string;
  displayName: string;
  language: string;
  devices: Array<{ id: string; pushToken: string; platform: string }>;
}

// ─── Localization ───────────────────────────────────────────────────────────

const ESCALATION_LABELS: Record<string, Record<string, string>> = {
  en: {
    high_priority_skipped: 'High priority reminder skipped',
    critical_skipped: 'Critical reminder skipped',
    repeated_skip_pattern: 'Multiple reminders skipped',
    guided_not_started: 'Guided task not started',
    default: 'Reminder escalation',
  },
  ar: {
    high_priority_skipped: 'تخطي تذكير عالي الأولوية',
    critical_skipped: 'تخطي تذكير حرج',
    repeated_skip_pattern: 'تخطي تذكيرات متعددة',
    guided_not_started: 'المهمة الإرشادية لم تبدأ',
    default: 'تصعيد التذكير',
  },
};

function buildEscalationMessage(
  data: EscalationNotificationData,
  language: string,
): { title: string; body: string } {
  const lang = language === 'ar' ? 'ar' : 'en';
  const labels = ESCALATION_LABELS[lang]!;
  const reasonLabel = labels[data.escalationReason] ?? labels['default']!;

  const title = `⚠️ ${reasonLabel}`;
  const body =
    lang === 'ar'
      ? `${data.patientName} تخطى "${data.reminderTitle}"`
      : `${data.patientName} skipped "${data.reminderTitle}"`;

  return { title, body };
}

// ─── DB Helpers ─────────────────────────────────────────────────────────────

async function getLinkedCaregiversWithDevices(patientId: string): Promise<CaregiverWithDevices[]> {
  const links = await prisma.careLink.findMany({
    where: { patientUserId: patientId, status: 'ACTIVE' },
    select: { caregiverUserId: true },
  });

  if (links.length === 0) return [];

  const caregiverIds = links.map((l) => l.caregiverUserId);
  const caregivers = await prisma.user.findMany({
    where: { id: { in: caregiverIds } },
    select: {
      id: true,
      displayName: true,
      language: true,
      devices: {
        select: { id: true, pushToken: true, platform: true },
      },
    },
  });

  // Filter out caregivers with zero devices
  return caregivers
    .filter((c) => c.devices.length > 0)
    .map((c) => ({
      id: c.id,
      displayName: c.displayName,
      language: c.language,
      devices: c.devices,
    }));
}

async function getPatientDetails(patientId: string): Promise<{ displayName: string } | null> {
  return prisma.user.findUnique({
    where: { id: patientId },
    select: { displayName: true },
  });
}

async function getReminderDetails(
  reminderId: string,
): Promise<{ title: string; priority: string } | null> {
  return prisma.reminder.findUnique({
    where: { id: reminderId },
    select: { title: true, priority: true },
  });
}

/**
 * Persist a notification record for a caregiver's in-app inbox.
 */
async function persistNotification(
  caregiverId: string,
  title: string,
  body: string,
  payload: Record<string, any>,
): Promise<void> {
  await prisma.notification.create({
    data: {
      userId: caregiverId,
      type: 'ESCALATION',
      title,
      body,
      payload,
    },
  });
}

// ─── Service ────────────────────────────────────────────────────────────────

export const notificationsService = {
  /**
   * Notify caregivers when an escalation is triggered.
   *
   * Changes from original:
   *  1. Non-blocking: push is enqueued, not awaited on the HTTP thread
   *  2. Multi-device: sends to every Device record, not just User.pushToken
   *  3. Localized: each caregiver receives the message in their language
   *  4. Persisted: saves to Notification table for in-app inbox
   */
  async notifyEscalation(
    patientId: string,
    reminderId: string,
    escalationReason: string,
  ): Promise<void> {
    const [patient, reminder, caregivers] = await Promise.all([
      getPatientDetails(patientId),
      getReminderDetails(reminderId),
      getLinkedCaregiversWithDevices(patientId),
    ]);

    if (!patient || !reminder) {
      console.warn('[Notifications] Cannot notify: patient or reminder not found');
      return;
    }

    if (caregivers.length === 0) {
      console.log('[Notifications] No caregivers with registered devices for patient:', patientId);
      return;
    }

    const payload = {
      type: 'escalation',
      patientId,
      reminderId,
      escalationReason,
      priority: reminder.priority,
    };

    const allMessages: PushMessage[] = [];

    for (const caregiver of caregivers) {
      const { title, body } = buildEscalationMessage(
        {
          patientId,
          patientName: patient.displayName,
          reminderId,
          reminderTitle: reminder.title,
          escalationReason,
          priority: reminder.priority,
        },
        caregiver.language,
      );

      // Persist to in-app inbox
      try {
        await persistNotification(caregiver.id, title, body, payload);
      } catch (err) {
        console.error('[Notifications] Failed to persist notification for', caregiver.id, err);
      }

      // Build a push message per device
      for (const device of caregiver.devices) {
        allMessages.push({
          to: device.pushToken,
          title,
          body,
          data: payload,
          sound: 'default',
          priority: 'high',
          channelId: device.platform === 'android' ? 'escalations' : undefined,
        });
      }
    }

    // Fire-and-forget: enqueue for background delivery
    enqueuePushMessages(allMessages);

    console.log(
      `[Notifications] Escalation queued for ${allMessages.length} device(s) across ${caregivers.length} caregiver(s)`,
    );
  },

  /**
   * Register a push token for a specific device.
   * Uses upsert so the same token is never duplicated.
   */
  async registerPushToken(
    userId: string,
    pushToken: string,
    platform: string = 'unknown',
  ): Promise<void> {
    await prisma.device.upsert({
      where: { pushToken },
      update: { userId, platform, updatedAt: new Date() },
      create: { userId, pushToken, platform },
    });
    console.log(`[Notifications] Registered device token for user ${userId} (${platform})`);
  },

  /**
   * Unregister all push tokens for a user (e.g., on logout from all devices).
   * Pass a specific token to remove only one device.
   */
  async unregisterPushToken(userId: string, pushToken?: string): Promise<void> {
    if (pushToken) {
      await prisma.device.deleteMany({ where: { userId, pushToken } });
      console.log(`[Notifications] Unregistered device token for user ${userId}`);
    } else {
      await prisma.device.deleteMany({ where: { userId } });
      console.log(`[Notifications] Unregistered all device tokens for user ${userId}`);
    }
  },

  /**
   * Get unread notification count for a user (for badge).
   */
  async getUnreadCount(userId: string): Promise<number> {
    return prisma.notification.count({ where: { userId, isRead: false } });
  },

  /**
   * List notifications for a user (paginated).
   */
  async listNotifications(
    userId: string,
    page = 1,
    limit = 30,
  ): Promise<{ notifications: any[]; total: number; unreadCount: number }> {
    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.notification.count({ where: { userId } }),
      prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    return { notifications, total, unreadCount };
  },

  /**
   * Mark a single notification as read.
   */
  async markRead(notificationId: string, userId: string): Promise<void> {
    await prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true },
    });
  },

  /**
   * Mark all notifications for a user as read.
   */
  async markAllRead(userId: string): Promise<void> {
    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  },
};

export default notificationsService;
