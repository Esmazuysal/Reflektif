import { Platform } from 'react-native';

/**
 * iOS Simulator → localhost
 * Android Emulator → 10.0.2.2
 * Gerçek telefon → Mac’in yerel IP’si (örn. 192.168.1.15)
 */
const LAN_IP = '192.168.1.15';

export const API_BASE_URL =
  Platform.OS === 'android'
    ? `http://10.0.2.2:5196`
    : Platform.OS === 'ios'
      ? `http://localhost:5196`
      : `http://${LAN_IP}:5196`;

// Fiziksel cihazda test ediyorsan yukarıdaki localhost satırını şu yap:
// `http://${LAN_IP}:5196`
