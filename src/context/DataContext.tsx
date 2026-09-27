import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Platform } from 'react-native';
import { api } from '../api/client';
import {
  emptyHealth,
  type PatientProfile,
  type WatchHealthSnapshot,
} from '../api/types';

import { XiaomiWatchService } from '../services/watchService';
import { HealthKitService } from '../services/healthKitService';

type DataContextValue = {
  patient: PatientProfile | null;
  health: WatchHealthSnapshot;
  loading: boolean;
  error: string | null;
  apiOnline: boolean;
  healthKitAvailable: boolean;
  healthKitConnected: boolean;
  refresh: () => Promise<void>;
  createPatient: (input: {
    fullName: string;
    birthYear?: number | null;
    stage?: string;
    caregiverName?: string;
    notes?: string;
  }) => Promise<void>;
  updatePatient: (input: {
    fullName: string;
    birthYear?: number | null;
    stage?: string;
    caregiverName?: string;
    notes?: string;
  }) => Promise<void>;
  addContact: (input: {
    name: string;
    relation: string;
    phone: string;
    isPrimary: boolean;
  }) => Promise<void>;
  removeContact: (id: string) => Promise<void>;
  addMedication: (input: {
    name: string;
    dose: string;
    times: string[];
  }) => Promise<void>;
  toggleMedicationTaken: (medId: string, index: number) => Promise<void>;
  removeMedication: (id: string) => Promise<void>;
  seedDemoHealth: () => Promise<void>;
  syncXiaomiWatch: (overrideData?: any) => Promise<void>;
  updateManualHealth: (bpm: number, steps?: number, spo2?: number) => Promise<void>;
  initHealthKit: () => Promise<boolean>;
};

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [patient, setPatient] = useState<PatientProfile | null>(null);
  const [health, setHealth] = useState<WatchHealthSnapshot>(emptyHealth);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [apiOnline, setApiOnline] = useState(false);
  const [healthKitAvailable] = useState(() => HealthKitService.isAvailable());
  const [healthKitConnected, setHealthKitConnected] = useState(false);

  // HealthKit başlatma fonksiyonu
  const initHealthKit = useCallback(async (): Promise<boolean> => {
    if (!healthKitAvailable) return false;
    const success = await HealthKitService.initialize();
    setHealthKitConnected(success);
    return success;
  }, [healthKitAvailable]);

  // iOS'ta HealthKit'i otomatik başlat
  useEffect(() => {
    if (healthKitAvailable) {
      initHealthKit();
    }
  }, [healthKitAvailable, initHealthKit]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await api.ping();
      setApiOnline(true);
    } catch {
      setApiOnline(false);
      setPatient(null);
      setHealth(emptyHealth);
      setError(
        'API\'ye bağlanılamadı. Backend\'i çalıştırın: cd api/Reflektif.Api && dotnet run',
      );
      setLoading(false);
      return;
    }

    try {
      const p = await api.getActivePatient();
      setPatient(p);

      // HealthKit bağlıysa: Apple Health'ten gerçek veriyi oku
      if (healthKitConnected) {
        const hkData = await HealthKitService.getAllHealthData();
        if (hkData && hkData.heartRate.current > 0) {
          const healthPayload = {
            source: 'apple_healthkit' as const,
            deviceName: 'Xiaomi Watch S4 (via Apple Health)',
            model: 'M2425W1',
            lastSyncAt: new Date().toISOString(),
            batteryPercent: 100,
            heartRate: {
              current: hkData.heartRate.current,
              resting: hkData.heartRate.resting,
              min: hkData.heartRate.min,
              max: hkData.heartRate.max,
              status: hkData.heartRate.status,
              samples: hkData.heartRate.samples.map(s => ({
                bpm: s.bpm,
                recordedAt: s.recordedAt,
              })),
            },
            steps: hkData.steps,
            sleep: hkData.sleep,
            spo2: hkData.spo2,
            calories: hkData.calories,
            stress: hkData.stress,
          };
          setHealth(healthPayload);

          // HealthKit verisini backend'e de kaydet (kalıcılık)
          try {
            await api.postHealth(p.id, {
              source: 'apple_healthkit',
              deviceName: 'Xiaomi Watch S4 (via Apple Health)',
              model: 'M2425W1',
              batteryPercent: 100,
              heartRateCurrent: hkData.heartRate.current,
              heartRateResting: hkData.heartRate.resting,
              heartRateMin: hkData.heartRate.min,
              heartRateMax: hkData.heartRate.max,
              heartRateStatus: hkData.heartRate.status,
              samples: hkData.heartRate.samples.map(s => ({
                bpm: s.bpm,
                recordedAt: s.recordedAt,
              })),
              stepsToday: hkData.steps.today,
              stepsGoal: hkData.steps.goal,
              sleepHours: hkData.sleep.hours,
              sleepQuality: hkData.sleep.quality,
              spo2Percent: hkData.spo2.percent,
              spo2Status: hkData.spo2.status,
              calories: hkData.calories,
              stressLevel: hkData.stress.level,
              stressLabel: hkData.stress.label,
            });
          } catch (e) {
            console.log('[DataContext] HealthKit verisi backend\'e kaydedilemedi:', e);
          }

          setLoading(false);
          return;
        }
      }

      // HealthKit yoksa veya veri yoksa: backend'den oku
      try {
        const h = await api.getLatestHealth(p.id);
        setHealth({
          ...h,
          heartRate: {
            ...h.heartRate,
            samples: (h.heartRate.samples ?? []).map((s: any) => ({
              bpm: s.bpm ?? s.Bpm,
              recordedAt: s.recordedAt ?? s.RecordedAt,
            })),
          },
        });
      } catch {
        setHealth(emptyHealth);
      }
    } catch {
      setPatient(null);
      setHealth(emptyHealth);
    } finally {
      setLoading(false);
    }
  }, [healthKitConnected]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // HealthKit otomatik senkronizasyon (her 10 saniyede bir Apple Health'ten oku)
  useEffect(() => {
    if (!healthKitConnected || !patient?.id) return;

    const interval = setInterval(() => {
      refresh();
    }, 10000); // Her 10 saniyede bir HealthKit'ten güncelle

    return () => clearInterval(interval);
  }, [healthKitConnected, patient?.id, refresh]);

  const createPatient = useCallback(
    async (input: {
      fullName: string;
      birthYear?: number | null;
      stage?: string;
      caregiverName?: string;
      notes?: string;
    }) => {
      await api.createPatient(input);
      await refresh();
    },
    [refresh],
  );

  const updatePatient = useCallback(
    async (input: {
      fullName: string;
      birthYear?: number | null;
      stage?: string;
      caregiverName?: string;
      notes?: string;
    }) => {
      if (!patient) return;
      await api.updatePatient(patient.id, input);
      await refresh();
    },
    [patient, refresh],
  );

  const addContact = useCallback(
    async (input: {
      name: string;
      relation: string;
      phone: string;
      isPrimary: boolean;
    }) => {
      if (!patient) return;
      await api.addContact(patient.id, input);
      await refresh();
    },
    [patient, refresh],
  );

  const removeContact = useCallback(
    async (id: string) => {
      await api.deleteContact(id);
      await refresh();
    },
    [refresh],
  );

  const addMedication = useCallback(
    async (input: { name: string; dose: string; times: string[] }) => {
      if (!patient) return;
      await api.addMedication(patient.id, input);
      await refresh();
    },
    [patient, refresh],
  );

  const toggleMedicationTaken = useCallback(
    async (medId: string, index: number) => {
      if (!patient) return;
      const med = patient.medications.find((m) => m.id === medId);
      if (!med) return;
      const taken = [...med.takenToday];
      taken[index] = !taken[index];
      await api.updateMedicationTaken(medId, taken);
      await refresh();
    },
    [patient, refresh],
  );

  const removeMedication = useCallback(
    async (id: string) => {
      await api.deleteMedication(id);
      await refresh();
    },
    [refresh],
  );

  const seedDemoHealth = useCallback(async () => {
    if (!patient) return;
    await api.postHealth(patient.id, {
      source: 'mock',
      deviceName: 'Xiaomi Watch S4',
      model: 'M2425W1',
      batteryPercent: 72,
      heartRateCurrent: 78,
      heartRateResting: 68,
      heartRateMin: 62,
      heartRateMax: 112,
      heartRateStatus: 'normal',
      samples: [
        { bpm: 72, recordedAt: '08:00' },
        { bpm: 76, recordedAt: '10:00' },
        { bpm: 88, recordedAt: '12:00' },
        { bpm: 82, recordedAt: '14:00' },
        { bpm: 78, recordedAt: '16:00' },
        { bpm: 74, recordedAt: '18:00' },
      ],
      stepsToday: 3240,
      stepsGoal: 5000,
      sleepHours: 6.5,
      sleepQuality: 'orta',
      spo2Percent: 97,
      spo2Status: 'normal',
      calories: 186,
      stressLevel: 32,
      stressLabel: 'düşük',
    });
    await refresh();
  }, [patient, refresh]);

  const syncXiaomiWatch = useCallback(
    async (_overrideData?: any) => {
      if (!patient) return;
      // Sadece backend'den en son gerçek veriyi yeniden oku
      // Gerçek veriler Python sync scripti veya HealthKit tarafından backend'e yazılıyor
      await refresh();
    },
    [patient, refresh],
  );

  const updateManualHealth = useCallback(
    async (bpm: number, steps?: number, spo2?: number) => {
      if (!patient) return;
      const now = new Date();
      const timeStr = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
      const currentSamples = (health.heartRate.samples ?? []).map((s: any) => ({
        bpm: s.bpm ?? s.Bpm ?? 70,
        recordedAt: s.recordedAt ?? s.RecordedAt ?? timeStr,
      }));
      if (currentSamples.length >= 10) currentSamples.shift();
      currentSamples.push({ bpm, recordedAt: timeStr });

      const bpms = currentSamples.map((s) => s.bpm);
      const minBpm = Math.min(...bpms);
      const maxBpm = Math.max(...bpms);

      await api.postHealth(patient.id, {
        source: 'xiaomi_watch_s4',
        deviceName: 'Xiaomi Watch S4',
        model: 'M2425W1',
        batteryPercent: health.batteryPercent || 85,
        heartRateCurrent: bpm,
        heartRateResting: minBpm,
        heartRateMin: minBpm,
        heartRateMax: maxBpm,
        heartRateStatus: bpm > 100 ? 'high' : bpm < 55 ? 'low' : 'normal',
        samples: currentSamples,
        stepsToday: steps ?? health.steps.today ?? 5000,
        stepsGoal: 5000,
        sleepHours: health.sleep.hours || 7.5,
        sleepQuality: health.sleep.quality || 'iyi',
        spo2Percent: spo2 ?? health.spo2.percent ?? 98,
        spo2Status: 'normal',
        calories: health.calories || 320,
        stressLevel: health.stress.level || 30,
        stressLabel: health.stress.label || 'normal',
      });
      await refresh();
    },
    [patient, health, refresh],
  );

  const value = useMemo(
    () => ({
      patient,
      health,
      loading,
      error,
      apiOnline,
      healthKitAvailable,
      healthKitConnected,
      refresh,
      createPatient,
      updatePatient,
      addContact,
      removeContact,
      addMedication,
      toggleMedicationTaken,
      removeMedication,
      seedDemoHealth,
      syncXiaomiWatch,
      updateManualHealth,
      initHealthKit,
    }),
    [
      patient,
      health,
      loading,
      error,
      apiOnline,
      healthKitAvailable,
      healthKitConnected,
      refresh,
      createPatient,
      updatePatient,
      addContact,
      removeContact,
      addMedication,
      toggleMedicationTaken,
      removeMedication,
      seedDemoHealth,
      syncXiaomiWatch,
      updateManualHealth,
      initHealthKit,
    ],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
