# TÜBİTAK 2209-A Projesi — Xiaomi Watch S4 Entegrasyon ve Yetkilendirme Raporu

**Proje Adı:** Reflektif – Alzheimer Hastalarının İhtiyaçlarına Yansıma Gibi Yanıt Veren Bir Sistem  
**Görev Sahibi (Kişi 2):** Akıllı Saat & Donanım Entegrasyon Sorumlusu  
**Entegre Edilen Cihaz:** Xiaomi Watch S4 (Model: M2425W1, OS: Xiaomi HyperOS)

---

## 1. Xiaomi SDK & Mimari Araştırması

Xiaomi Watch S4, Xiaomi'nin hafif siklet **HyperOS / RTOS** işletim sistemini kullanmaktadır. Akıllı saat üzerindeki biyometrik sensörlerden (PPG Optik Nabız Sensörü, SpO₂ Sensörü, 6-Eksenli İvmeölçer/Jiroskop, Dahili GNSS GPS) elde edilen sağlık verilerinin mobil uygulamaya ve C# sunucusuna aktarılması için 2 temel SDK ve Protokol mimarisi incelenmiştir:

### A. Xiaomi Wearable SDK & Bluetooth LE (GATT Heart Rate Profile)
* **Servis UUID:** `0x180D` (Heart Rate Service)
* **Karakteristik UUID:** `0x2A37` (Heart Rate Measurement)
* **Çalışma Prensibi:** Akıllı saat Bluetooth Low Energy (BLE) modunda yayın yaparken, mobil uygulama veya istemci GATT katmanından abone olur (`startNotifications`). Saatin PPG sensörünün ürettiği ham bayt paketleri çözümlenerek anlık kalp ritmi (BPM) elde edilir.

### B. Mi Fitness & Health Connect / HealthKit Entegrasyonu
* **Android Tarafı:** Android 14+ varsayılan `Health Connect API` (`androidx.health.connect`)
* **iOS Tarafı:** Apple `HealthKit Framework`
* **Çalışma Prensibi:** Saatin gün boyu topladığı veri (Uyku kalitesi, SpO₂ seviyesi, stres skoru, yakılan kalori, adım sayısı) Mi Fitness arka plan servisi aracılığıyla işletim sisteminin ortak sağlık veri havuzuna eşitlenir. Uygulamamız bu havuzdan yetkilendirilmiş erişim ile verileri çeker.

---

## 2. Yetkilendirme ve İzinler (Authorization & Permissions)

Veri gizliliği ve kişisel sağlık verilerinin korunması (KVKK & GDPR) kapsamında sistemde 2 aşamalı yetkilendirme altyapısı kurulmuştur:

### 1. İşletim Sistemi Seviyesi İzinler

#### Android Manifest (`AndroidManifest.xml`):
```xml
<!-- Bluetooth LE İzinleri -->
<uses-permission android:name="android.permission.BLUETOOTH" />
<uses-permission android:name="android.permission.BLUETOOTH_ADMIN" />
<uses-permission android:name="android.permission.BLUETOOTH_SCAN" />
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />

<!-- Health Connect İzinleri -->
<uses-permission android:name="android.permission.health.READ_HEART_RATE" />
<uses-permission android:name="android.permission.health.READ_STEPS" />
<uses-permission android:name="android.permission.health.READ_SLEEP" />
<uses-permission android:name="android.permission.health.READ_OXYGEN_SATURATION" />
```

#### iOS Info.plist (`Info.plist`):
```xml
<key>NSHealthShareUsageDescription</key>
<string>Reflektif, Alzheimer hastasının anlık nabız ve sağlık verilerini takip etmek için izin ister.</string>
<key>NSBluetoothAlwaysUsageDescription</key>
<string>Xiaomi Watch S4 cihazına canlı bağlanmak için Bluetooth izni gereklidir.</string>
```

---

## 3. Watch S4 Bağlantısı ve İlk Gerçek Veriyi Alma (Kod Uygulaması)

Projede `src/services/watchService.ts` ve `src/screens/HealthScreen.tsx` bileşenleri geliştirilerek **ilk gerçek veri alma süreci** başarıyla tamamlanmıştır.

### A. Bayt Seviyesinde Nabız Verisi Çözümleme Algorithm (Veri Alma):
```typescript
// Heart Rate Measurement (0x2A37) Bayt Çözümleme
const flags = value.getUint8(0);
let bpm = 0;

if (flags & 0x01) {
  // 16-bit UINT16 Nabız Değeri
  bpm = value.getUint16(1, true);
} else {
  // 8-bit UINT8 Nabız Değeri
  bpm = value.getUint8(1);
}

console.log("Xiaomi Watch S4 Gerçek Anlık Nabız (BPM):", bpm);
```

### B. C# ASP.NET Core REST API'ye İlk Veri İletimi:
Toplanan biyometrik paket `POST /api/patients/{patientId}/health` endpoint'ine şu JSON formatında başarıyla iletilmektedir:

```json
{
  "source": "xiaomi_watch_s4",
  "deviceName": "Xiaomi Watch S4",
  "model": "M2425W1",
  "batteryPercent": 88,
  "heartRateCurrent": 76,
  "heartRateResting": 68,
  "heartRateMin": 62,
  "heartRateMax": 118,
  "heartRateStatus": "normal",
  "samples": [
    { "bpm": 72, "recordedAt": "14:00" },
    { "bpm": 76, "recordedAt": "16:45" }
  ],
  "stepsToday": 4350,
  "stepsGoal": 5000,
  "sleepHours": 7.2,
  "sleepQuality": "iyi",
  "spo2Percent": 98,
  "calories": 250,
  "stressLevel": 26
}
```

---

## 4. Sonuç ve Başarı Ölçütleri

* [x] **Xiaomi SDK & Mimari Araştırması:** Tamamlandı.
* [x] **Watch S4 Bağlantı Servisi:** `XiaomiWatchService` olarak yazıldı.
* [x] **Yetkilendirme Akışı:** Bluetooth LE ve Health Connect katmanları tanımlandı.
* [x] **İlk Gerçek Verinin Alınması ve Sunucuya Kaydı:** `HealthScreen` arayüzü ve C# API entegrasyonu ile doğrulandı.
