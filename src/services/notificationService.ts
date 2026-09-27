import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function ensureNotificationPermission(): Promise<boolean> {
  const current: any = await Notifications.getPermissionsAsync();
  if (current?.granted || current?.status === 'granted') return true;
  const req: any = await Notifications.requestPermissionsAsync();
  return !!(req?.granted || req?.status === 'granted');
}

export async function fireLocalAlarm(title: string, body: string) {
  try {
    await ensureNotificationPermission();
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.MAX,
      },
      trigger: null,
    });
  } catch {
    // Simülatör / web’de sessizce geç
  }
}

export function configureAndroidChannel() {
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('alarms', {
      name: 'Kritik uyarılar',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    }).catch(() => undefined);
  }
}
