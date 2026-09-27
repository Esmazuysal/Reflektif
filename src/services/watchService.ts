import { api } from '../api/client';
import type { WatchHealthSnapshot } from '../api/types';

export interface XiaomiWatchDevice {
  name: string;
  model: string;
  macAddress?: string;
  batteryPercent: number;
  connectionStatus: 'connected' | 'syncing' | 'disconnected' | 'connecting';
  lastSyncAt: string;
}

export const initialXiaomiWatchState: XiaomiWatchDevice = {
  name: 'Xiaomi Watch S4',
  model: 'M2425W1',
  macAddress: '78:02:B7:XX:XX:XX',
  batteryPercent: 0,
  connectionStatus: 'disconnected',
  lastSyncAt: '--:--',
};

/**
 * Xiaomi Watch S4 Entegrasyon Servisi
 *
 * Veriler şu zincirle gelir:
 *   Xiaomi Watch S4 → Mi Fitness App → Xiaomi Cloud → Python Sync Script → C# Backend
 *
 * Bu servis SADECE C# Backend'den gerçek veriyi okur.
 * Sahte / simüle veri üretmez.
 */
export class XiaomiWatchService {

  /**
   * C# Backend'den en son kaydedilmiş GERÇEK saat verisini al.
   * Python sync scripti verileri buraya yazıyor.
   */
  static async getLatestWatchData(
    patientId: string
  ): Promise<WatchHealthSnapshot | null> {
    try {
      const data = await api.getLatestHealth(patientId);
      return data;
    } catch {
      // Henüz sağlık verisi yoksa null döner
      return null;
    }
  }

  /**
   * Veritabanındaki verinin kaynağını kontrol et.
   * 'xiaomi_cloud_sync' veya 'mi_fitness_export' ise gerçek veridir.
   * 'mock' veya başka bir şey ise sahte veridir.
   */
  static isRealData(snapshot: WatchHealthSnapshot | null): boolean {
    if (!snapshot) return false;
    const source = (snapshot as any).source || '';
    return source === 'xiaomi_cloud_sync' || source === 'mi_fitness_export' || source === 'apple_healthkit';
  }

  /**
   * Python sync scriptini çalıştırmak için bilgi mesajı döner.
   * (Frontend'den Python scripti doğrudan çalıştırılamaz)
   */
  static getSyncInstructions(): string {
    return `Gerçek saat verilerini almak için bilgisayarınızda şu komutu çalıştırın:

  cd /Users/duygudilarazent/Downloads/Reflektif-main/scripts
  python3 xiaomi_sync.py

Bu script:
  1. Xiaomi Cloud hesabınıza giriş yapar
  2. Xiaomi Watch S4'ten sağlık verilerini çeker
  3. Verileri C# Backend'e otomatik gönderir
  4. Uygulama kendini otomatik günceller`;
  }
}
