import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * Notification wrapper for scheduling local reminders and native alarms.
 *
 * Two scheduling modes:
 *   - scheduleReminder(): standard notification (can be muted by DND)
 *   - scheduleAlarm(): alarm-grade delivery that breaks through silent mode
 *     • iOS: uses critical alert sound (requires Apple entitlement in EAS builds)
 *     • Android: uses a dedicated 'alarms' channel with bypassDnd + MAX importance
 *
 * On web, scheduling is skipped gracefully.
 */

if (Platform.OS !== 'web') {
  // Configure how notifications appear when app is in foreground
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export const notifications = {
  /**
   * Request notification permissions from the user.
   * Sets up notification channels on Android.
   * Returns true if granted.
   */
  async requestPermission(): Promise<boolean> {
    if (Platform.OS === 'web') return false;

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    if (existingStatus === 'granted') return true;

    const { status } = await Notifications.requestPermissionsAsync();

    if (Platform.OS === 'android') {
      // Standard reminders channel
      await Notifications.setNotificationChannelAsync('reminders', {
        name: 'Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#4285F4',
      });

      // Alarm-grade channel for critical reminders
      await Notifications.setNotificationChannelAsync('alarms', {
        name: 'Critical Alarms',
        description: 'Urgent reminders that ring even in Do Not Disturb mode',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 250, 500, 250, 500],
        lightColor: '#FF3B30',
        bypassDnd: true,
        showBadge: true,
      });
    }

    return status === 'granted';
  },

  /**
   * Schedule a standard local reminder notification.
   * Respects DND / silent mode.
   */
  async scheduleReminder(params: {
    id: string;
    title: string;
    body: string;
    scheduledAt: Date;
  }): Promise<string> {
    if (Platform.OS === 'web') {
      console.log('[Notifications] Skipping scheduling on web');
      return 'web-noop';
    }

    const trigger = params.scheduledAt.getTime() - Date.now();

    const content: Notifications.NotificationContentInput = {
      title: params.title,
      body: params.body,
      data: { reminderId: params.id },
      sound: 'default',
      // @ts-ignore — channelId for Android so it uses the 'reminders' channel
      channelId: Platform.OS === 'android' ? 'reminders' : undefined,
    };

    if (trigger <= 0) {
      return Notifications.scheduleNotificationAsync({ content, trigger: null });
    }

    return Notifications.scheduleNotificationAsync({
      content,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.floor(trigger / 1000),
      },
    });
  },

  /**
   * Schedule a native alarm-grade notification for critical reminders.
   *
   * iOS: Requests critical alert permission and uses it — rings even in silent/DND.
   *      Requires the `com.apple.developer.usernotifications.critical-alerts` entitlement
   *      (added to app.json for EAS builds). In Expo Go, silently falls back to normal.
   *
   * Android: Uses the 'alarms' channel (bypassDnd: true, MAX importance) which wakes
   *          the screen like an alarm clock notification.
   */
  async scheduleAlarm(params: {
    id: string;
    title: string;  // Should be the reminder name
    body: string;
    scheduledAt: Date;
  }): Promise<string> {
    if (Platform.OS === 'web') {
      console.log('[Notifications] Skipping alarm scheduling on web');
      return 'web-noop';
    }

    const trigger = params.scheduledAt.getTime() - Date.now();

    let content: Notifications.NotificationContentInput;

    if (Platform.OS === 'ios') {
      // iOS critical alert — rings even in silent/DND mode
      content = {
        title: params.title,
        body: params.body,
        data: { reminderId: params.id, isAlarm: true },
        sound: 'default',
        // @ts-ignore — Expo typing doesn't expose critical yet, but the API accepts it
        critical: true,
      };
    } else {
      // Android — use the alarm channel that bypasses DND
      content = {
        title: params.title,
        body: params.body,
        data: { reminderId: params.id, isAlarm: true },
        sound: 'default',
        // @ts-ignore — channelId in content for Android
        channelId: 'alarms',
      };
    }

    if (trigger <= 0) {
      return Notifications.scheduleNotificationAsync({ content, trigger: null });
    }

    return Notifications.scheduleNotificationAsync({
      content,
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.floor(trigger / 1000),
        repeats: false,
      },
    });
  },

  /**
   * Cancel a previously scheduled notification.
   */
  async cancelReminder(notificationId: string): Promise<void> {
    if (Platform.OS === 'web') return;
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  },

  /**
   * Cancel all scheduled notifications.
   */
  async cancelAll(): Promise<void> {
    if (Platform.OS === 'web') return;
    await Notifications.cancelAllScheduledNotificationsAsync();
  },
};
