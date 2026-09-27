export type WatchSource = 'mi_fitness' | 'healthkit' | 'health_connect' | 'mock' | 'xiaomi_cloud_sync' | 'mi_fitness_export' | 'xiaomi_watch_s4' | 'apple_healthkit';

export interface HeartRateSample {
  bpm: number;
  recordedAt: string;
}

export interface WatchHealthSnapshot {
  source: WatchSource | string;
  deviceName: string;
  model: string;
  lastSyncAt: string;
  batteryPercent: number;
  heartRate: {
    current: number;
    resting: number;
    min: number;
    max: number;
    samples: HeartRateSample[];
    status: 'normal' | 'high' | 'low' | string;
  };
  steps: { today: number; goal: number };
  sleep: { hours: number; quality: string };
  spo2: { percent: number; status: string };
  calories: number;
  stress: { level: number; label: string };
}

export interface SafeZone {
  id: string;
  name: string;
  centerLat: number;
  centerLng: number;
  radiusMeters: number;
  lastAddress: string;
  lastLat?: number | null;
  lastLng?: number | null;
  inSafeZone: boolean;
  locationUpdatedAt?: string | null;
}

export interface EmergencyContact {
  id: string;
  name: string;
  relation: string;
  phone: string;
  isPrimary: boolean;
}

export interface Medication {
  id: string;
  name: string;
  dose: string;
  times: string[];
  takenToday: boolean[];
}

export interface AlarmEvent {
  id: string;
  patientId: string;
  type: 'health_critical' | 'safe_zone_exit' | string;
  severity: 'info' | 'warning' | 'critical' | string;
  title: string;
  message: string;
  payloadJson?: string;
  acknowledged: boolean;
  createdAt: string;
}

export interface PatientProfile {
  id: string;
  fullName: string;
  birthYear?: number | null;
  stage: string;
  caregiverName: string;
  notes: string;
  createdAt?: string;
  contacts: EmergencyContact[];
  medications: Medication[];
  safeZone?: SafeZone | null;
}

/** Saat verisi henüz gelmeden gösterilecek boş şablon */
export const emptyHealth: WatchHealthSnapshot = {
  source: 'mock',
  deviceName: 'Xiaomi Watch S4',
  model: 'M2425W1',
  lastSyncAt: new Date().toISOString(),
  batteryPercent: 0,
  heartRate: {
    current: 0,
    resting: 0,
    min: 0,
    max: 0,
    status: 'normal',
    samples: [],
  },
  steps: { today: 0, goal: 5000 },
  sleep: { hours: 0, quality: '—' },
  spo2: { percent: 0, status: 'normal' },
  calories: 0,
  stress: { level: 0, label: '—' },
};

export const games = [
  {
    id: 'g1',
    title: 'Eşleştirme',
    subtitle: 'Kartları eşleştir, hafızayı çalıştır',
    duration: '5 dk',
  },
  {
    id: 'g2',
    title: 'Kelime Hatırla',
    subtitle: 'Gösterilen kelimeleri sırayla hatırla',
    duration: '4 dk',
  },
  {
    id: 'g3',
    title: 'Renk Dizisi',
    subtitle: 'Renk sırasını takip et',
    duration: '3 dk',
  },
];
