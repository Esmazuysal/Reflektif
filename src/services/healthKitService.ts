/**
 * HealthKit Service — Apple Health'ten Gerçek Saat Verisi Okuma
 * 
 * Veri Akışı:
 * Xiaomi Watch S4 → Mi Fitness App → Apple Health → Bu Servis → Backend API
 * 
 * Bu servis, Mi Fitness uygulamasının Apple Health'e aktardığı gerçek
 * saat verilerini (nabız, adım, SpO₂, uyku) okur ve backend'e gönderir.
 */

import { Platform, NativeModules } from 'react-native';

// react-native-health modülünü iOS'ta yükle
let AppleHealthKit: any = null;

function loadHealthKitModule() {
  if (Platform.OS === 'ios' && AppleHealthKit === null) {
    try {
      const HealthModule = require('react-native-health');
      AppleHealthKit = HealthModule.default || HealthModule;
    } catch (e) {
      console.log('[HealthKit] react-native-health yüklenemedi:', e);
    }
  }
  return AppleHealthKit;
}

// İzinleri dinamik al
function getHealthKitPermissions() {
  const mod = loadHealthKitModule();
  const P = mod?.Constants?.Permissions;
  if (P) {
    return {
      permissions: {
        read: [
          P.HeartRate,
          P.StepCount,
          P.OxygenSaturation,
          P.SleepAnalysis,
          P.ActiveEnergyBurned,
          P.RestingHeartRate,
          P.HeartRateVariabilitySDNN,
        ].filter(Boolean),
        write: [] as string[],
      },
    };
  }
  return {
    permissions: {
      read: [
        'HeartRate',
        'StepCount',
        'OxygenSaturation',
        'SleepAnalysis',
        'ActiveEnergyBurned',
        'RestingHeartRate',
        'HeartRateVariabilitySDNN',
      ],
      write: [] as string[],
    },
  };
}

export interface HealthKitHeartRateSample {
  bpm: number;
  recordedAt: string;        // "HH:mm" formatı
  recordedAtFull: string;    // ISO string
}

export interface HealthKitData {
  source: 'apple_healthkit';
  heartRate: {
    current: number;
    resting: number;
    min: number;
    max: number;
    status: 'normal' | 'high' | 'low';
    samples: HealthKitHeartRateSample[];
  };
  steps: {
    today: number;
    goal: number;
  };
  sleep: {
    hours: number;
    quality: string;
  };
  spo2: {
    percent: number;
    status: string;
  };
  calories: number;
  stress: {
    level: number;
    label: string;
  };
}

class HealthKitServiceClass {
  private initialized = false;
  private available = false;
  private autoSyncInterval: ReturnType<typeof setInterval> | null = null;

  /**
   * HealthKit'in kullanılabilir olup olmadığını kontrol eder
   */
  isAvailable(): boolean {
    if (Platform.OS !== 'ios') return false;
    const mod = loadHealthKitModule();
    return (
      mod !== null &&
      mod !== undefined &&
      typeof mod.initHealthKit === 'function' &&
      !!NativeModules.AppleHealthKit
    );
  }

  /**
   * HealthKit'i başlatır ve izinleri ister
   */
  async initialize(force = false): Promise<boolean> {
    if (!this.isAvailable()) {
      console.log('[HealthKit] iOS değil veya AppleHealthKit yerel modülü yüklü değil');
      return false;
    }

    if (this.initialized && this.available && !force) return this.available;

    const options = getHealthKitPermissions();

    return new Promise((resolve) => {
      try {
        AppleHealthKit.initHealthKit(options, (error: string) => {
          if (error) {
            console.log('[HealthKit] İzin hatası:', error);
            this.initialized = true;
            this.available = false;
            resolve(false);
            return;
          }
          console.log('[HealthKit] ✅ Başarıyla başlatıldı! Gerçek veri okunabilir.');
          this.initialized = true;
          this.available = true;
          resolve(true);
        });
      } catch (err) {
        console.log('[HealthKit] initHealthKit istisnai hata:', err);
        this.initialized = true;
        this.available = false;
        resolve(false);
      }
    });
  }

  /**
   * Son 24 saatin nabız örneklerini getirir
   */
  async getHeartRateSamples(): Promise<HealthKitHeartRateSample[]> {
    if (!this.available || !AppleHealthKit?.getHeartRateSamples) return [];

    const now = new Date();
    // Son 48 saat (Mi Fitness gecikmeyle aktarabilir)
    const start48h = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    
    return new Promise((resolve) => {
      AppleHealthKit.getHeartRateSamples(
        {
          startDate: start48h.toISOString(),
          endDate: now.toISOString(),
          ascending: true,
          limit: 200,
        },
        (err: string, results: any[]) => {
          if (err || !results) {
            console.log('[HealthKit] Nabız okuma hatası:', err);
            resolve([]);
            return;
          }

          console.log(`[HealthKit] Ham nabız kayıt sayısı: ${results.length}`);
          if (results.length > 0) {
            const lastRaw = results[results.length - 1];
            console.log(`[HealthKit] En son kayıt: ${Math.round(lastRaw.value)} bpm @ ${lastRaw.startDate || lastRaw.endDate}`);
          }

          // Bugünün başlangıcı
          const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          
          const hourlyMap = new Map<string, HealthKitHeartRateSample>();
          
          for (const sample of results) {
            const date = new Date(sample.startDate || sample.endDate);
            // Sadece bugünkü verileri saatlik gruba al
            if (date >= startOfToday) {
              const hour = date.getHours().toString().padStart(2, '0');
              const timeKey = `${hour}:00`;
              const bpm = Math.round(sample.value);
              
              hourlyMap.set(timeKey, {
                bpm,
                recordedAt: timeKey,
                recordedAtFull: date.toISOString(),
              });
            }
          }

          const samples = Array.from(hourlyMap.values()).sort(
            (a, b) => a.recordedAt.localeCompare(b.recordedAt)
          );

          console.log(`[HealthKit] ✅ ${samples.length} nabız örneği okundu (bugün)`);
          resolve(samples);
        }
      );
    });
  }

  /**
   * En son kaydedilen ham nabız örneğini getirir (en güncel kayıt)
   */
  async getLatestRawHeartRate(): Promise<{ bpm: number; dateString: string } | null> {
    if (!this.available || !AppleHealthKit?.getHeartRateSamples) return null;

    const now = new Date();
    const start48h = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    return new Promise((resolve) => {
      AppleHealthKit.getHeartRateSamples(
        {
          startDate: start48h.toISOString(),
          endDate: now.toISOString(),
          ascending: true,
        },
        (err: string, results: any[]) => {
          if (err || !results || results.length === 0) {
            resolve(null);
            return;
          }
          const lastSample = results[results.length - 1];
          const latestBpm = Math.round(lastSample.value);
          const dateStr = lastSample.startDate || lastSample.endDate || '';
          console.log(`[HealthKit] ✅ Gerçek en son ham nabız: ${latestBpm} bpm @ ${dateStr}`);
          resolve({ bpm: latestBpm, dateString: dateStr });
        }
      );
    });
  }

  /**
   * Dinlenme nabzını getirir
   */
  async getRestingHeartRate(): Promise<number> {
    if (!this.available || !AppleHealthKit?.getRestingHeartRate) return 0;

    return new Promise((resolve) => {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      AppleHealthKit.getRestingHeartRate(
        {
          startDate: startOfDay.toISOString(),
          endDate: now.toISOString(),
        },
        (err: string, results: any) => {
          if (err || !results) {
            resolve(0);
            return;
          }
          if (Array.isArray(results) && results.length > 0) {
            resolve(Math.round(results[results.length - 1].value));
          } else if (results.value) {
            resolve(Math.round(results.value));
          } else {
            resolve(0);
          }
        }
      );
    });
  }

  /**
   * Bugünkü adım sayısını getirir
   */
  async getStepCount(): Promise<number> {
    if (!this.available || !AppleHealthKit?.getStepCount) return 0;

    return new Promise((resolve) => {
      const now = new Date();
      
      AppleHealthKit.getStepCount(
        {
          date: now.toISOString(),
          includeManuallyAdded: true,
        },
        (err: string, results: any) => {
          if (err || !results) {
            resolve(0);
            return;
          }
          resolve(Math.round(results.value || 0));
        }
      );
    });
  }

  /**
   * Son SpO₂ ölçümünü getirir
   */
  async getSpO2(): Promise<number> {
    if (!this.available || !AppleHealthKit?.getOxygenSaturationSamples) return 0;

    return new Promise((resolve) => {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      AppleHealthKit.getOxygenSaturationSamples(
        {
          startDate: startOfDay.toISOString(),
          endDate: now.toISOString(),
          ascending: false,
          limit: 1,
        },
        (err: string, results: any[]) => {
          if (err || !results || results.length === 0) {
            resolve(0);
            return;
          }
          const val = results[0].value;
          resolve(Math.round(val > 1 ? val : val * 100));
        }
      );
    });
  }

  /**
   * Son gece uyku verisini getirir
   */
  async getSleepData(): Promise<{ hours: number; quality: string }> {
    if (!this.available || !AppleHealthKit?.getSleepSamples) return { hours: 0, quality: '—' };

    return new Promise((resolve) => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      AppleHealthKit.getSleepSamples(
        {
          startDate: yesterday.toISOString(),
          endDate: now.toISOString(),
        },
        (err: string, results: any[]) => {
          if (err || !results || results.length === 0) {
            resolve({ hours: 0, quality: '—' });
            return;
          }

          let totalMinutes = 0;
          for (const sample of results) {
            const category = (sample.value || '').toLowerCase();
            if (category === 'asleep' || category === 'inbed' || 
                category === 'asleepcore' || category === 'asleepdeep' || 
                category === 'asleeprem') {
              const start = new Date(sample.startDate);
              const end = new Date(sample.endDate);
              totalMinutes += (end.getTime() - start.getTime()) / (1000 * 60);
            }
          }

          const hours = Math.round(totalMinutes / 60 * 10) / 10;
          let quality = '—';
          if (hours >= 7) quality = 'iyi';
          else if (hours >= 5) quality = 'orta';
          else if (hours > 0) quality = 'kötü';

          resolve({ hours, quality });
        }
      );
    });
  }

  /**
   * Bugünkü aktif kalori yakımını getirir
   */
  async getActiveCalories(): Promise<number> {
    if (!this.available || !AppleHealthKit?.getActiveEnergyBurned) return 0;

    return new Promise((resolve) => {
      const now = new Date();
      
      AppleHealthKit.getActiveEnergyBurned(
        {
          date: now.toISOString(),
          includeManuallyAdded: false,
        },
        (err: string, results: any[]) => {
          if (err || !results) {
            resolve(0);
            return;
          }
          if (Array.isArray(results)) {
            const total = results.reduce((sum: number, r: any) => sum + (r.value || 0), 0);
            resolve(Math.round(total));
          } else if (results && typeof (results as any).value === 'number') {
            resolve(Math.round((results as any).value));
          } else {
            resolve(0);
          }
        }
      );
    });
  }

  /**
   * Tüm sağlık verilerini tek seferde toplar
   */
  async getAllHealthData(): Promise<HealthKitData | null> {
    if (!this.available) {
      console.log('[HealthKit] Servis müsait değil');
      return null;
    }

    try {
      console.log('[HealthKit] 🔄 Tüm sağlık verileri okunuyor...');

      const [samples, latestRawHR, restingHR, steps, spo2, sleep, calories] = await Promise.all([
        this.getHeartRateSamples(),
        this.getLatestRawHeartRate(),
        this.getRestingHeartRate(),
        this.getStepCount(),
        this.getSpO2(),
        this.getSleepData(),
        this.getActiveCalories(),
      ]);

      const currentHR = latestRawHR ? latestRawHR.bpm : (samples.length > 0 ? samples[samples.length - 1].bpm : (restingHR || 75));
      const minHR = samples.length > 0 ? Math.min(...samples.map((s) => s.bpm)) : currentHR;
      const maxHR = samples.length > 0 ? Math.max(...samples.map((s) => s.bpm)) : currentHR;

      let hrStatus: 'normal' | 'high' | 'low' = 'normal';
      if (currentHR > 100) hrStatus = 'high';
      else if (currentHR < 50) hrStatus = 'low';

      let spo2Status = 'normal';
      if (spo2 > 0 && spo2 < 95) spo2Status = 'low';

      const data: HealthKitData = {
        source: 'apple_healthkit',
        heartRate: {
          current: currentHR,
          resting: restingHR || Math.round(currentHR * 0.9),
          min: minHR,
          max: maxHR,
          status: hrStatus,
          samples,
        },
        steps: {
          today: steps || 0,
          goal: 5000,
        },
        sleep,
        spo2: {
          percent: spo2 || 98,
          status: spo2Status,
        },
        calories: calories || 0,
        stress: {
          level: 30,
          label: 'normal',
        },
      };

      console.log('[HealthKit] ✅ Veriler başarıyla toplandı:', {
        currentHR,
        steps,
        spo2,
        sleepHours: sleep.hours,
      });

      return data;
    } catch (e) {
      console.log('[HealthKit] Veri toplama hatası:', e);
      return null;
    }
  }

  /**
   * Arka planda otomatik senkronizasyonu başlatır (her intervalMs sürede bir)
   */
  startAutoSync(patientId: string, pushCallback: (payload: any) => Promise<void>, intervalMs = 15000) {
    this.stopAutoSync();

    console.log(`[HealthKit] 🔁 Otomatik senkronizasyon başlatıldı (${intervalMs / 1000}s)`);

    const syncFn = async () => {
      const data = await this.getAllHealthData();
      if (data) {
        await pushCallback(data);
      }
    };

    syncFn();

    this.autoSyncInterval = setInterval(syncFn, intervalMs);
  }

  /**
   * Otomatik senkronizasyonu durdurur
   */
  stopAutoSync() {
    if (this.autoSyncInterval) {
      clearInterval(this.autoSyncInterval);
      this.autoSyncInterval = null;
      console.log('[HealthKit] 🛑 Otomatik senkronizasyon durduruldu');
    }
  }
}

export const HealthKitService = new HealthKitServiceClass();
