import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// Configure foreground notification presentation
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotificationsAsync(userId: string): Promise<string | null> {
  let token: string | null = null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('jalkhoj-alerts', {
      name: 'Jal Khoj Railway & Expense Alerts',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF6B35',
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Failed to get push token for push notification!');
    return null;
  }

  try {
    const pushTokenData = await Notifications.getExpoPushTokenAsync();
    token = pushTokenData.data;

    // Register or upsert in device_tokens table with RLS
    if (token) {
      const platform = Platform.OS === 'ios' ? 'ios' : 'android';
      await supabase.from('device_tokens').upsert(
        {
          user_id: userId,
          expo_push_token: token,
          platform,
          device_name: `${Platform.OS} device`,
        },
        { onConflict: 'user_id, expo_push_token' }
      );
    }
  } catch (err) {
    console.warn('Error fetching or registering push token:', err);
  }

  return token;
}
