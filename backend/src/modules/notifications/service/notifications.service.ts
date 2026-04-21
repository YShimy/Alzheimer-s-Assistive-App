/**
 * Notification Service
 * 
 * Sends push notifications to caregivers when escalations are triggered.
 * Uses Expo Push Notification API.
 */

import { prisma } from '@/shared/db/prisma';

interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  sound?: string;
  priority?: 'default' | 'normal' | 'high';
}

export interface EscalationNotificationData {
  patientId: string;
  patientName: string;
  reminderId: string;
  reminderTitle: string;
  escalationReason: string;
  priority: string;
}

/**
 * Send push notification via Expo Push API
 */
async function sendExpoPushNotification(messages: PushMessage[]): Promise<void> {
  if (messages.length === 0) return;

  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('[Notifications] Expo push failed:', data);
    } else {
      console.log(`[Notifications] Sent ${messages.length} push notifications`);
    }
  } catch (error) {
    console.error('[Notifications] Failed to send push notifications:', error);
  }
}

/**
 * Get linked caregivers for a patient
 */
async function getLinkedCaregivers(patientId: string): Promise<Array<{ id: string; pushToken: string | null; displayName: string }>> {
  // Get active care links for patient
  const links = await prisma.careLink.findMany({
    where: {
      patientUserId: patientId,
      status: 'active',
    },
    select: {
      caregiverUserId: true,
    },
  });

  if (links.length === 0) return [];

  // Get caregiver user details
  const caregiverIds = links.map((l) => l.caregiverUserId);
  const caregivers = await prisma.user.findMany({
    where: {
      id: { in: caregiverIds },
      pushToken: { not: null },
    },
    select: {
      id: true,
      pushToken: true,
      displayName: true,
    },
  });

  return caregivers.map((c) => ({
    id: c.id,
    pushToken: c.pushToken,
    displayName: c.displayName,
  }));
}

/**
 * Get patient details
 */
async function getPatientDetails(patientId: string): Promise<{ displayName: string } | null> {
  const patient = await prisma.user.findUnique({
    where: { id: patientId },
    select: { displayName: true },
  });
  return patient;
}

/**
 * Get reminder details
 */
async function getReminderDetails(reminderId: string): Promise<{ title: string; priority: string } | null> {
  const reminder = await prisma.reminder.findUnique({
    where: { id: reminderId },
    select: { title: true, priority: true },
  });
  return reminder;
}

/**
 * Build escalation notification message
 */
function buildEscalationMessage(data: EscalationNotificationData): { title: string; body: string } {
  const reasonLabels: Record<string, string> = {
    'high_priority_skipped': 'High priority reminder skipped',
    'critical_skipped': 'Critical reminder skipped',
    'repeated_skip_pattern': 'Multiple reminders skipped',
    'guided_not_started': 'Guided task not started',
  };

  const reasonLabel = reasonLabels[data.escalationReason] || 'Reminder escalation';
  
  return {
    title: `⚠️ ${reasonLabel}`,
    body: `${data.patientName} skipped "${data.reminderTitle}"`,
  };
}

export const notificationsService = {
  /**
   * Notify caregivers when an escalation is triggered
   */
  async notifyEscalation(
    patientId: string,
    reminderId: string,
    escalationReason: string,
  ): Promise<void> {
    // Get patient and reminder details
    const [patient, reminder, caregivers] = await Promise.all([
      getPatientDetails(patientId),
      getReminderDetails(reminderId),
      getLinkedCaregivers(patientId),
    ]);

    if (!patient || !reminder) {
      console.warn('[Notifications] Cannot notify: patient or reminder not found');
      return;
    }

    if (caregivers.length === 0) {
      console.log('[Notifications] No caregivers with push tokens found for patient:', patientId);
      return;
    }

    // Build notification data
    const notificationData: EscalationNotificationData = {
      patientId,
      patientName: patient.displayName,
      reminderId,
      reminderTitle: reminder.title,
      escalationReason,
      priority: reminder.priority,
    };

    const { title, body } = buildEscalationMessage(notificationData);

    // Build push messages for each caregiver
    const messages: PushMessage[] = caregivers.map((caregiver) => ({
      to: caregiver.pushToken,
      title,
      body,
      data: {
        type: 'escalation',
        patientId,
        reminderId,
        escalationReason,
        priority: reminder.priority,
      },
      sound: 'default',
      priority: 'high',
    }));

    // Send notifications
    await sendExpoPushNotification(messages);
    
    console.log(`[Notifications] Escalation notification sent for reminder ${reminderId} to ${caregivers.length} caregiver(s)`);
  },

  /**
   * Register a push token for a user
   */
  async registerPushToken(userId: string, pushToken: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { pushToken },
    });
    console.log(`[Notifications] Registered push token for user ${userId}`);
  },

  /**
   * Remove push token for a user (e.g., on logout)
   */
  async unregisterPushToken(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { pushToken: null },
    });
    console.log(`[Notifications] Unregistered push token for user ${userId}`);
  },
};

export default notificationsService;
