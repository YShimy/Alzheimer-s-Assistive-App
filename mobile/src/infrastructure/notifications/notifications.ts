import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * Notification wrapper for scheduling local reminders.
 * Patient reminders are scheduled locally for reliability.
 */

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

export const notifications = {
  /**
   * Request notification permissions from the user.
   * Returns true if granted.
   */
  async requestPermission(): Promise<boolean> {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();

    if (existingStatus === 'granted') return true;

    const { status } = await Notifications.requestPermissionsAsync();

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('reminders', {
        name: 'Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#4285F4',
      });
    }

    return status === 'granted';
  },

  /**
   * Schedule a local reminder notification.
   * Returns the notification identifier (for cancellation).
   */
  async scheduleReminder(params: {
    id: string;
    title: string;
    body: string;
    scheduledAt: Date;
  }): Promise<string> {
    const trigger = params.scheduledAt.getTime() - Date.now();

    if (trigger <= 0) {
      // If the time has passed, show immediately
      return Notifications.scheduleNotificationAsync({
        content: {
          title: params.title,
          body: params.body,
          data: { reminderId: params.id },
          sound: true,
        },
        trigger: null, // immediate
      });
    }

    return Notifications.scheduleNotificationAsync({
      content: {
        title: params.title,
        body: params.body,
        data: { reminderId: params.id },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.floor(trigger / 1000),
      },
    });
  },

  /**
   * Cancel a previously scheduled notification.
   */
  async cancelReminder(notificationId: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  },

  /**
   * Cancel all scheduled notifications.
   */
  async cancelAll(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  },
};
