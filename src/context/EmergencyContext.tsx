import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { api } from '../api/client';
import type { AlarmEvent } from '../api/types';
import {
  configureAndroidChannel,
  ensureNotificationPermission,
  fireLocalAlarm,
} from '../services/notificationService';
import { useData } from './DataContext';

type EmergencyContextValue = {
  alarms: AlarmEvent[];
  openCount: number;
  refreshAlarms: () => Promise<void>;
  acknowledge: (alarmId: string) => Promise<void>;
  simulateSafeZoneExit: () => Promise<void>;
  simulateCriticalHeart: () => Promise<void>;
};

const EmergencyContext = createContext<EmergencyContextValue | null>(null);

export function EmergencyProvider({ children }: { children: React.ReactNode }) {
  const { patient, refresh: refreshPatient } = useData();
  const [alarms, setAlarms] = useState<AlarmEvent[]>([]);
  const seen = useRef<Set<string>>(new Set());

  useEffect(() => {
    configureAndroidChannel();
    ensureNotificationPermission();
  }, []);

  const refreshAlarms = useCallback(async () => {
    if (!patient) {
      setAlarms([]);
      return;
    }
    try {
      const list = await api.getAlarms(patient.id, true);
      setAlarms(list);

      for (const a of list) {
        if (!seen.current.has(a.id)) {
          seen.current.add(a.id);
          await fireLocalAlarm(a.title, a.message);
        }
      }
    } catch {
      // API yoksa sessiz
    }
  }, [patient]);

  useEffect(() => {
    refreshAlarms();
    const t = setInterval(refreshAlarms, 8000);
    return () => clearInterval(t);
  }, [refreshAlarms]);

  const acknowledge = useCallback(
    async (alarmId: string) => {
      if (!patient) return;
      await api.ackAlarm(patient.id, alarmId);
      await refreshAlarms();
    },
    [patient, refreshAlarms],
  );

  const simulateSafeZoneExit = useCallback(async () => {
    if (!patient) return;
    const res = await api.testSafeZoneExit(patient.id);
    if (res.alarm) {
      seen.current.delete(res.alarm.id);
    }
    await refreshPatient();
    await refreshAlarms();
  }, [patient, refreshPatient, refreshAlarms]);

  const simulateCriticalHeart = useCallback(async () => {
    if (!patient) return;
    await api.postHealth(patient.id, {
      source: 'mock',
      deviceName: 'Xiaomi Watch S4',
      model: 'M2425W1',
      batteryPercent: 60,
      heartRateCurrent: 145,
      heartRateResting: 70,
      heartRateMin: 70,
      heartRateMax: 145,
      heartRateStatus: 'high',
      samples: [{ bpm: 145, recordedAt: 'şimdi' }],
      stepsToday: 1000,
      stepsGoal: 5000,
      sleepHours: 6,
      sleepQuality: 'orta',
      spo2Percent: 96,
      spo2Status: 'normal',
      calories: 100,
      stressLevel: 70,
      stressLabel: 'yüksek',
    });
    await refreshPatient();
    await refreshAlarms();
  }, [patient, refreshPatient, refreshAlarms]);

  const value = useMemo(
    () => ({
      alarms,
      openCount: alarms.length,
      refreshAlarms,
      acknowledge,
      simulateSafeZoneExit,
      simulateCriticalHeart,
    }),
    [
      alarms,
      refreshAlarms,
      acknowledge,
      simulateSafeZoneExit,
      simulateCriticalHeart,
    ],
  );

  return (
    <EmergencyContext.Provider value={value}>
      {children}
    </EmergencyContext.Provider>
  );
}

export function useEmergency() {
  const ctx = useContext(EmergencyContext);
  if (!ctx) throw new Error('useEmergency within EmergencyProvider');
  return ctx;
}
