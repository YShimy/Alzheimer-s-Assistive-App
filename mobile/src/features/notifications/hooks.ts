/**
 * Notifications Hooks
 * 
 * Push notification token management for Expo.
 */

import { useEffect, useCallback } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { notificationsApi } from './api';
import { useSessionStore } from '@/src/state/sessionStore';

/**
 * Register for push notifications and send token to backend
 */
async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (Platform.OS === 'web') {
    console.log('[Notifications] Push notifications not available on web');
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (!Device.isDevice) {
    console.log('[Notifications] Must use physical device for push notifications');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  if (finalStatus !== 'granted') {
    console.log('[Notifications] Permission not granted');
    return null;
  }

  try {
    // For Expo Go, we need a projectId - skip if not available
    const pushTokenString = (await Notifications.getExpoPushTokenAsync({
      projectId: undefined, // Let Expo infer from manifest
    })).data;
    console.log('[Notifications] Got push token:', pushTokenString);
    return pushTokenString;
  } catch (error: any) {
    // Silently fail - push notifications are optional for this prototype
    console.log('[Notifications] Push notifications not available:', error.message);
    return null;
  }
}

/**
 * Hook to register push token when user is authenticated
 */
export function usePushNotifications() {
  const userId = useSessionStore((s) => s.userId);

  useEffect(() => {
    if (!userId) return;
    if (Platform.OS === 'web') return;

    let isMounted = true;

    async function registerToken() {
      const token = await registerForPushNotificationsAsync();
      if (token && isMounted) {
        try {
          await notificationsApi.registerPushToken(token);
          console.log('[Notifications] Token registered with backend');
        } catch (error) {
          console.error('[Notifications] Failed to register token:', error);
        }
      }
    }

    registerToken();

    return () => {
      isMounted = false;
    };
  }, [userId]);
}

/**
 * Hook to listen for incoming push notifications
 */
export function useNotificationListener(onNotification?: (notification: Notifications.Notification) => void) {
  useEffect(() => {
    if (Platform.OS === 'web') return;

    const subscription = Notifications.addNotificationReceivedListener((notification) => {
      console.log('[Notifications] Received:', notification);
      onNotification?.(notification);
    });

    const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('[Notifications] Response:', response);
      // Handle notification tap here
      const data = response.notification.request.content.data;
      if (data?.type === 'escalation') {
        // Navigate to patient details or show escalation alert
        console.log('[Notifications] Escalation tapped:', data);
      }
    });

    return () => {
      subscription.remove();
      responseSubscription.remove();
    };
  }, [onNotification]);
}

/**
 * Unregister push token on logout
 */
export async function unregisterPushToken(): Promise<void> {
  try {
    await notificationsApi.unregisterPushToken();
    console.log('[Notifications] Token unregistered');
  } catch (error) {
    console.error('[Notifications] Failed to unregister token:', error);
  }
}
