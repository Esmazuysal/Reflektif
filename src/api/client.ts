import { API_BASE_URL } from './config';
import type {
  Medication,
  PatientProfile,
  WatchHealthSnapshot,
} from './types';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const message = data?.message ?? `API hata (${res.status})`;
    throw new Error(message);
  }
  return data as T;
}

export const api = {
  ping: () => request<{ status: string }>('/api/health'),

  getActivePatient: () => request<PatientProfile>('/api/patients/active'),

  listPatients: () =>
    request<
      Array<{
        id: string;
        fullName: string;
        birthYear?: number;
        stage: string;
        caregiverName: string;
      }>
    >('/api/patients'),

  getPatient: (id: string) => request<PatientProfile>(`/api/patients/${id}`),

  createPatient: (body: {
    fullName: string;
    birthYear?: number | null;
    stage?: string;
    caregiverName?: string;
    notes?: string;
  }) =>
    request<PatientProfile>('/api/patients', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updatePatient: (
    id: string,
    body: {
      fullName: string;
      birthYear?: number | null;
      stage?: string;
      caregiverName?: string;
      notes?: string;
    },
  ) =>
    request<PatientProfile>(`/api/patients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  deletePatient: (id: string) =>
    request<void>(`/api/patients/${id}`, { method: 'DELETE' }),

  addContact: (
    patientId: string,
    body: { name: string; relation: string; phone: string; isPrimary: boolean },
  ) =>
    request(`/api/patients/${patientId}/contacts`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  deleteContact: (contactId: string) =>
    request<void>(`/api/patients/contacts/${contactId}`, { method: 'DELETE' }),

  addMedication: (
    patientId: string,
    body: { name: string; dose: string; times: string[] },
  ) =>
    request<Medication>(`/api/patients/${patientId}/medications`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updateMedicationTaken: (medId: string, takenToday: boolean[]) =>
    request<Medication>(`/api/patients/medications/${medId}/taken`, {
      method: 'PUT',
      body: JSON.stringify({ takenToday }),
    }),

  deleteMedication: (medId: string) =>
    request<void>(`/api/patients/medications/${medId}`, { method: 'DELETE' }),

  getLatestHealth: (patientId: string) =>
    request<WatchHealthSnapshot>(`/api/patients/${patientId}/health/latest`),

  postHealth: (patientId: string, body: Record<string, unknown>) =>
    request<WatchHealthSnapshot>(`/api/patients/${patientId}/health`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};
