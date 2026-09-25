import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { api } from '../api/client';
import {
  emptyHealth,
  type PatientProfile,
  type WatchHealthSnapshot,
} from '../api/types';

type DataContextValue = {
  patient: PatientProfile | null;
  health: WatchHealthSnapshot;
  loading: boolean;
  error: string | null;
  apiOnline: boolean;
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
};

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [patient, setPatient] = useState<PatientProfile | null>(null);
  const [health, setHealth] = useState<WatchHealthSnapshot>(emptyHealth);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [apiOnline, setApiOnline] = useState(false);

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
        'API’ye bağlanılamadı. Backend’i çalıştırın: cd api/Reflektif.Api && dotnet run',
      );
      setLoading(false);
      return;
    }

    try {
      const p = await api.getActivePatient();
      setPatient(p);
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
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

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

  const value = useMemo(
    () => ({
      patient,
      health,
      loading,
      error,
      apiOnline,
      refresh,
      createPatient,
      updatePatient,
      addContact,
      removeContact,
      addMedication,
      toggleMedicationTaken,
      removeMedication,
      seedDemoHealth,
    }),
    [
      patient,
      health,
      loading,
      error,
      apiOnline,
      refresh,
      createPatient,
      updatePatient,
      addContact,
      removeContact,
      addMedication,
      toggleMedicationTaken,
      removeMedication,
      seedDemoHealth,
    ],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
