import { Platform } from 'react-native';

/**
 * Reflektif API Konfigürasyonu
 * Web tarayıcısında çalışırken her zaman localhost:5196 kullanılır.
 * Fiziksel mobil cihazlarda .env içindeki IP veya dinamik IP kullanılır.
 */
const getApiBaseUrl = (): string => {
  if (Platform.OS === 'web') {
    return 'http://localhost:5196';
  }
  return process.env.EXPO_PUBLIC_API_BASE_URL || 'http://192.168.1.154:5196';
};

export const API_BASE_URL = getApiBaseUrl();
