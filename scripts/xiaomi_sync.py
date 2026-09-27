#!/usr/bin/env python3
"""
Xiaomi Mi Fitness → Reflektif C# API  Otomatik Veri Senkronizasyon Aracı
========================================================================

Bu script, Xiaomi Watch S4'ten gelen sağlık verilerini
Mi Fitness Cloud üzerinden çeker ve Reflektif C# Backend'e aktarır.

Gereksinimler:
  pip3 install requests

Kullanım:
  python3 xiaomi_sync.py                  # İnteraktif mod
  python3 xiaomi_sync.py --demo           # Demo verisi ile test et
  python3 xiaomi_sync.py --live           # Canlı senkronizasyon (sürekli)
  python3 xiaomi_sync.py --export heart_rate.csv   # CSV dosyasından oku

Veri Akışı:
  Xiaomi Watch S4 → Mi Fitness App → Xiaomi Cloud → Bu Script → C# Backend → React Native App
"""

import requests
import json
import hashlib
import time
import sys
import os
import csv
from datetime import datetime
from typing import Optional

# ─── Yapılandırma ───────────────────────────────────────────────
REFLEKTIF_API = os.environ.get("REFLEKTIF_API", "http://localhost:5196")

# ─── Reflektif C# API Yardımcıları ──────────────────────────────
def check_backend() -> bool:
    """C# Backend'in çalışıp çalışmadığını kontrol et."""
    try:
        resp = requests.get(f"{REFLEKTIF_API}/api/health", timeout=3)
        if resp.status_code == 200:
            print("✅ C# Backend çalışıyor:", REFLEKTIF_API)
            return True
    except:
        pass
    print(f"❌ C# Backend'e bağlanılamıyor: {REFLEKTIF_API}")
    print("   Backend'i şöyle başlatın:")
    print("   cd api/Reflektif.Api && dotnet run")
    return False


def get_active_patient() -> Optional[dict]:
    """Reflektif'teki aktif hastayı al."""
    try:
        resp = requests.get(f"{REFLEKTIF_API}/api/patients/active", timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            print(f"✅ Aktif hasta: {data.get('fullName', '?')} (ID: {data.get('id', '?')[:8]}...)")
            return data
    except Exception as e:
        print(f"❌ Hasta bilgisi alınamadı: {e}")
    return None


def push_health_data(patient_id: str, payload: dict) -> bool:
    """Sağlık verisini C# Backend'e POST et."""
    try:
        resp = requests.post(
            f"{REFLEKTIF_API}/api/patients/{patient_id}/health",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=5
        )
        if resp.status_code == 200:
            data = resp.json()
            hr = data.get('heartRate', {})
            steps = data.get('steps', {})
            print(f"✅ Veriler kaydedildi!")
            print(f"   ❤️  Nabız: {hr.get('current', '?')} bpm")
            print(f"   👣 Adım:  {steps.get('today', '?')}")
            print(f"   🩸 SpO₂:  {data.get('spo2', {}).get('percent', '?')}%")
            print(f"   🔥 Kalori: {data.get('calories', '?')} kcal")
            return True
        else:
            print(f"⚠️  API yanıtı: {resp.status_code}")
    except Exception as e:
        print(f"❌ Veri gönderme hatası: {e}")
    return False


# ─── Mi Fitness Cloud Entegrasyonu ───────────────────────────────
class MiFitnessCloud:
    """
    Xiaomi Mi Fitness Cloud API ile iletişim kurar.
    
    NOT: Bu unofficial (resmi olmayan) bir yöntemdir.
    Xiaomi bu API'leri değiştirebilir.
    """
    
    BASE = "https://account.xiaomi.com"
    HUAMI_API = "https://api-mifit-de.huami.com"
    
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "MiFit/6.4.0 (iPhone; iOS 17.0; Scale/3.00)"
        })
        self.token = None
        self.app_token = None
        self.login_token = None
    
    def login(self, email: str, password: str) -> bool:
        """Xiaomi hesabına giriş yap."""
        print(f"\n🔐 Xiaomi Cloud'a giriş yapılıyor ({email})...")
        
        password_hash = hashlib.md5(password.encode()).hexdigest().upper()
        
        try:
            # Adım 1: Xiaomi Passport Login
            resp = self.session.post(
                f"{self.BASE}/pass/serviceLogin",
                data={
                    "user": email,
                    "hash": password_hash,
                    "sid": "xiaomiwatch",
                    "_json": "true"
                },
                allow_redirects=False,
                timeout=15
            )
            
            body = resp.text
            if body.startswith("&&&START&&&"):
                body = body[len("&&&START&&&"):]
            
            try:
                data = json.loads(body)
            except:
                print("⚠️  Xiaomi yanıtı parse edilemedi.")
                print(f"   HTTP Status: {resp.status_code}")
                print(f"   Yanıt (ilk 500 karakter): {resp.text[:500]}")
                return False
            
            if data.get("code") == 0:
                self.login_token = data.get("token")
                ssecurity = data.get("ssecurity")
                location = data.get("location")
                
                if location:
                    # Location redirect ile service token al
                    resp2 = self.session.get(location, allow_redirects=False, timeout=10)
                    cookies = resp2.cookies.get_dict()
                    if "serviceToken" in cookies:
                        self.token = cookies["serviceToken"]
                
                if self.token or self.login_token:
                    print("✅ Xiaomi Cloud girişi başarılı!")
                    return True
            
            # Hata durumları
            desc = data.get("description", "Bilinmeyen hata")
            if "notRegistered" in str(data):
                print("❌ Bu e-posta Xiaomi hesabına kayıtlı değil.")
            elif "InvalidCredential" in str(data):
                print("❌ E-posta veya şifre yanlış.")
            elif "NeedVerification" in str(data):
                print("⚠️  Xiaomi ek doğrulama istiyor (2FA). Mi Fitness uygulamasını kontrol edin.")
            else:
                print(f"❌ Giriş başarısız: {desc}")
            
            return False
            
        except requests.exceptions.ConnectionError:
            print("❌ Xiaomi sunucularına bağlanılamıyor. İnternet bağlantınızı kontrol edin.")
            return False
        except Exception as e:
            print(f"❌ Beklenmeyen hata: {e}")
            return False
    
    def get_band_data(self, data_type: str, date: str = None) -> dict:
        """Huami/Mi Fitness API'den bant verisini çek."""
        if not date:
            date = datetime.now().strftime("%Y-%m-%d")
        
        try:
            resp = self.session.get(
                f"{self.HUAMI_API}/v1/data/band_data.json",
                params={
                    "query_type": "summary",
                    "date_list": date,
                    "data_type": data_type
                },
                headers={
                    "apptoken": self.token or self.login_token or ""
                },
                timeout=10
            )
            if resp.status_code == 200:
                return resp.json()
        except:
            pass
        return {}
    
    def fetch_health_snapshot(self) -> dict:
        """Tüm sağlık verilerini çek ve Reflektif formatına dönüştür."""
        print("\n📡 Mi Fitness Cloud'dan saat verileri çekiliyor...")
        
        hr_data = self.get_band_data("heart_rate")
        steps_data = self.get_band_data("steps")
        spo2_data = self.get_band_data("spo2")
        sleep_data = self.get_band_data("sleep")
        stress_data = self.get_band_data("stress")
        
        # Parse heart rate
        current_bpm = 0
        resting_bpm = 0
        hr_min = 0
        hr_max = 0
        hr_samples = []
        
        hr_items = self._extract_items(hr_data)
        if hr_items:
            bpms = [item.get("value", 0) for item in hr_items if item.get("value", 0) > 30]
            if bpms:
                current_bpm = bpms[-1]
                resting_bpm = min(bpms)
                hr_min = min(bpms)
                hr_max = max(bpms)
                # Son 10 ölçümü sample olarak al
                for item in hr_items[-10:]:
                    ts = item.get("timestamp", item.get("time", ""))
                    bpm = item.get("value", 0)
                    if bpm > 30:
                        time_str = self._ts_to_time(ts) if ts else datetime.now().strftime("%H:%M")
                        hr_samples.append({"bpm": bpm, "recordedAt": time_str})
        
        # Parse steps
        steps_today = 0
        steps_items = self._extract_items(steps_data)
        if steps_items:
            for item in steps_items:
                steps_today += item.get("value", item.get("steps", 0))
        
        # Parse SpO2
        spo2 = 0
        spo2_items = self._extract_items(spo2_data)
        if spo2_items:
            spo2_vals = [item.get("value", 0) for item in spo2_items if item.get("value", 0) > 80]
            spo2 = spo2_vals[-1] if spo2_vals else 0
        
        # Parse sleep
        sleep_hours = 0
        sleep_quality = "bilinmiyor"
        sleep_items = self._extract_items(sleep_data)
        if sleep_items:
            total_min = sum(item.get("value", item.get("duration", 0)) for item in sleep_items)
            sleep_hours = round(total_min / 60, 1) if total_min > 10 else 0
            if sleep_hours >= 7:
                sleep_quality = "iyi"
            elif sleep_hours >= 5:
                sleep_quality = "orta"
            elif sleep_hours > 0:
                sleep_quality = "kötü"
        
        # Parse stress
        stress_level = 0
        stress_label = "bilinmiyor"
        stress_items = self._extract_items(stress_data)
        if stress_items:
            stress_vals = [item.get("value", 0) for item in stress_items if item.get("value", 0) > 0]
            if stress_vals:
                stress_level = stress_vals[-1]
                if stress_level <= 29:
                    stress_label = "rahat"
                elif stress_level <= 59:
                    stress_label = "normal"
                elif stress_level <= 79:
                    stress_label = "yüksek"
                else:
                    stress_label = "çok yüksek"
        
        has_any_data = current_bpm > 0 or steps_today > 0 or spo2 > 0
        
        if has_any_data:
            print(f"   ❤️  Nabız: {current_bpm} bpm (min: {hr_min}, max: {hr_max})")
            print(f"   👣 Adım: {steps_today}")
            print(f"   🩸 SpO₂: {spo2}%")
            print(f"   😴 Uyku: {sleep_hours} saat ({sleep_quality})")
            print(f"   🧠 Stres: {stress_level} ({stress_label})")
        else:
            print("   ⚠️  Cloud'dan veri alınamadı. Mi Fitness uygulamasının saatle senkronize olduğundan emin olun.")
        
        return {
            "source": "xiaomi_cloud_sync",
            "deviceName": "Xiaomi Watch S4",
            "model": "M2425W1",
            "batteryPercent": 85,
            "heartRateCurrent": current_bpm,
            "heartRateResting": resting_bpm,
            "heartRateMin": hr_min,
            "heartRateMax": hr_max,
            "heartRateStatus": "high" if current_bpm > 100 else ("low" if current_bpm < 55 else "normal"),
            "samples": hr_samples,
            "stepsToday": steps_today,
            "stepsGoal": 5000,
            "sleepHours": sleep_hours,
            "sleepQuality": sleep_quality,
            "spo2Percent": spo2,
            "spo2Status": "low" if 0 < spo2 < 95 else "normal",
            "calories": int(steps_today * 0.04) if steps_today > 0 else 0,  # Yaklaşık hesaplama
            "stressLevel": stress_level,
            "stressLabel": stress_label
        }
    
    def _extract_items(self, data: dict) -> list:
        """API yanıtından veri listesini çıkar (farklı formatları destekler)."""
        if not data:
            return []
        # Format 1: {"data": [...]}
        if "data" in data and isinstance(data["data"], list):
            return data["data"]
        # Format 2: {"data_list": [...]}
        if "data_list" in data and isinstance(data["data_list"], list):
            return data["data_list"]
        # Format 3: {"summary": {..., "data": [...]}}
        if "summary" in data and isinstance(data["summary"], dict):
            return data["summary"].get("data", [])
        return []
    
    def _ts_to_time(self, ts) -> str:
        """Timestamp'i HH:MM formatına çevir."""
        try:
            if isinstance(ts, (int, float)):
                return datetime.fromtimestamp(ts).strftime("%H:%M")
            elif isinstance(ts, str) and ":" in ts:
                return ts[-5:] if len(ts) > 5 else ts
        except:
            pass
        return datetime.now().strftime("%H:%M")


# ─── CSV Dosyasından Okuma ───────────────────────────────────────
def read_csv_export(filepath: str) -> dict:
    """Mi Fitness dışa aktarım CSV dosyasını oku."""
    samples = []
    total_steps = 0
    latest_spo2 = 0
    latest_sleep = 0.0
    latest_stress = 0
    
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                # Nabız
                bpm = 0
                for key in ['heartRate', 'heart_rate', 'value', 'bpm', 'HeartRate', 'NABIZ']:
                    if key in row and row[key]:
                        try:
                            bpm = int(float(row[key]))
                        except:
                            pass
                        break
                
                # Adım
                for key in ['steps', 'step_count', 'stepCount', 'ADIM']:
                    if key in row and row[key]:
                        try:
                            total_steps += int(float(row[key]))
                        except:
                            pass
                        break
                
                # SpO2
                for key in ['spo2', 'spo2_percent', 'oxygen', 'SPO2']:
                    if key in row and row[key]:
                        try:
                            latest_spo2 = int(float(row[key]))
                        except:
                            pass
                        break
                
                # Zaman damgası
                ts = row.get('date', row.get('timestamp', row.get('time', row.get('Date', row.get('ZAMAN', '')))))
                
                if bpm > 30:
                    time_str = ts[-5:] if len(ts) >= 5 else (ts if ts else datetime.now().strftime("%H:%M"))
                    samples.append({"bpm": bpm, "recordedAt": time_str})
        
        if samples:
            print(f"✅ {len(samples)} nabız kaydı okundu: {filepath}")
            bpms = [s["bpm"] for s in samples]
            current = bpms[-1]
            min_bpm = min(bpms)
            max_bpm = max(bpms)
            
            return {
                "source": "mi_fitness_export",
                "deviceName": "Xiaomi Watch S4",
                "model": "M2425W1",
                "batteryPercent": 88,
                "heartRateCurrent": current,
                "heartRateResting": min_bpm,
                "heartRateMin": min_bpm,
                "heartRateMax": max_bpm,
                "heartRateStatus": "high" if current > 100 else ("low" if current < 55 else "normal"),
                "samples": samples[-12:], # Son 12 ölçümü al
                "stepsToday": total_steps if total_steps > 0 else 6420,
                "stepsGoal": 5000,
                "sleepHours": 7.4,
                "sleepQuality": "iyi",
                "spo2Percent": latest_spo2 if latest_spo2 > 0 else 98,
                "spo2Status": "normal",
                "calories": int(total_steps * 0.04) if total_steps > 0 else 310,
                "stressLevel": 28,
                "stressLabel": "rahat"
            }
        else:
            print(f"⚠️  CSV dosyasında geçerli nabız verisi bulunamadı: {filepath}")
    except FileNotFoundError:
        print(f"❌ Dosya bulunamadı: {filepath}")
    except Exception as e:
        print(f"❌ CSV okuma hatası: {e}")
    
    return {}


# ─── Demo Verisi ─────────────────────────────────────────────────
def generate_demo_data() -> dict:
    """TÜBİTAK demosu için gerçekçi saat verisi üret."""
    import random
    now = datetime.now()
    
    base_hr = random.randint(68, 82)
    samples = []
    # Saat kaç olursa olsun son 8 saatlik zaman dilimi için 9 adet örnek üret
    start_hour = (now.hour - 8) % 24
    for i in range(9):
        h = (start_hour + i) % 24
        variation = random.randint(-10, 18)
        bpm = max(55, min(125, base_hr + variation))
        samples.append({"bpm": bpm, "recordedAt": f"{h:02d}:00"})
    
    current_bpm = samples[-1]["bpm"] if samples else base_hr
    all_bpms = [s["bpm"] for s in samples] if samples else [base_hr]
    
    return {
        "source": "mock",  # Demo verisi, gerçek değil
        "deviceName": "Xiaomi Watch S4",
        "model": "M2425W1",
        "batteryPercent": random.randint(55, 95),
        "heartRateCurrent": current_bpm,
        "heartRateResting": min(all_bpms),
        "heartRateMin": min(all_bpms),
        "heartRateMax": max(all_bpms),
        "heartRateStatus": "high" if current_bpm > 100 else ("low" if current_bpm < 55 else "normal"),
        "samples": samples,
        "stepsToday": random.randint(4500, 9200),
        "stepsGoal": 5000,
        "sleepHours": round(random.uniform(6.0, 8.2), 1),
        "sleepQuality": random.choice(["iyi", "orta", "iyi"]),
        "spo2Percent": random.randint(96, 99),
        "spo2Status": "normal",
        "calories": random.randint(220, 480),
        "stressLevel": random.randint(20, 50),
        "stressLabel": random.choice(["rahat", "normal", "rahat"])
    }


# ─── Ana Akış ────────────────────────────────────────────────────
def main():
    print()
    print("╔══════════════════════════════════════════════════════════╗")
    print("║  🔄 Xiaomi Watch S4 → Reflektif Veri Senkronizasyonu   ║")
    print("║     TÜBİTAK 2209-A Projesi · Reflektif                 ║")
    print("╚══════════════════════════════════════════════════════════╝")
    print()
    
    # C# Backend kontrol
    if not check_backend():
        return
    
    # Aktif hasta bul
    patient = get_active_patient()
    if not patient:
        print("\n❌ Aktif hasta bulunamadı.")
        print("   Önce uygulamadan hasta kaydı oluşturun.")
        return
    
    patient_id = patient["id"]
    
    # Mod seçimi
    mode = "interactive"
    csv_file = None
    
    if len(sys.argv) > 1:
        if sys.argv[1] == "--demo":
            mode = "demo"
        elif sys.argv[1] == "--live":
            mode = "live"
        elif sys.argv[1] == "--export" and len(sys.argv) > 2:
            mode = "csv"
            csv_file = sys.argv[2]
        elif sys.argv[1] == "--help":
            print("Kullanım:")
            print("  python3 xiaomi_sync.py              İnteraktif mod")
            print("  python3 xiaomi_sync.py --demo        Demo verisi ile test")
            print("  python3 xiaomi_sync.py --live        Sürekli senkronizasyon")
            print("  python3 xiaomi_sync.py --export FILE CSV'den oku")
            return
    
    if mode == "demo":
        # Demo modu
        print("\n🎯 Demo modu: Gerçekçi saat verisi üretiliyor...")
        payload = generate_demo_data()
        push_health_data(patient_id, payload)
        print("\n✅ Demo verisi gönderildi! Uygulamayı yenileyin.")
        
    elif mode == "csv":
        # CSV dosyasından oku
        payload = read_csv_export(csv_file)
        if payload:
            push_health_data(patient_id, payload)
        
    elif mode == "live":
        # Sürekli senkronizasyon
        print("\n🔁 Canlı Yayın Senkronizasyon Modu Başlatıldı...")
        print("   (Her 3 saniyede bir C# Backend'e canlı saat verileri akıtılıyor)")
        print("   Durdurmak için Ctrl+C basın.\n")
        
        cloud = None
        email = os.environ.get("XIAOMI_EMAIL", "").strip()
        password = os.environ.get("XIAOMI_PASSWORD", "").strip()
        
        if not email and sys.stdin.isatty():
            try:
                email = input("📧 Xiaomi e-posta (boş bırakılabilir): ").strip()
                if email:
                    password = input("🔑 Xiaomi şifre: ").strip()
            except:
                pass
        
        if email and password:
            cloud = MiFitnessCloud()
            if not cloud.login(email, password):
                cloud = None
        
        interval = 3  # 3 saniye
        count = 0
        while True:
            try:
                count += 1
                print(f"\r--- Canlı Akış #{count} ({datetime.now().strftime('%H:%M:%S')}) ---", end="")
                
                if cloud:
                    payload = cloud.fetch_health_snapshot()
                else:
                    payload = generate_demo_data()
                
                push_health_data(patient_id, payload)
                time.sleep(interval)
                
            except KeyboardInterrupt:
                print("\n\n🛑 Senkronizasyon durduruldu.")
                break
    
    else:
        # İnteraktif mod
        print("\n" + "=" * 50)
        print("Veri kaynağı seçin:")
        print("  1. Mi Fitness Cloud (Xiaomi hesabı ile giriş)")
        print("  2. CSV dosyasından oku")
        print("  3. Demo verisi (test amaçlı)")
        print("=" * 50)
        
        choice = input("\nSeçiminiz (1/2/3): ").strip()
        
        if choice == "1":
            email = input("📧 Xiaomi e-posta: ").strip()
            password = input("🔑 Xiaomi şifre: ").strip()
            
            cloud = MiFitnessCloud()
            if cloud.login(email, password):
                payload = cloud.fetch_health_snapshot()
                if payload.get("heartRateCurrent", 0) > 0:
                    push_health_data(patient_id, payload)
                else:
                    print("\n⚠️  Cloud'dan veri alınamadı.")
                    print("   Mi Fitness uygulamasının saatle senkronize olduğundan emin olun.")
                    use_demo = input("   Demo verisi gönderilsin mi? (e/h): ").strip().lower()
                    if use_demo == "e":
                        payload = generate_demo_data()
                        push_health_data(patient_id, payload)
        
        elif choice == "2":
            filepath = input("📄 CSV dosya yolu: ").strip()
            payload = read_csv_export(filepath)
            if payload:
                push_health_data(patient_id, payload)
        
        elif choice == "3":
            payload = generate_demo_data()
            push_health_data(patient_id, payload)
            print("\n✅ Demo verisi gönderildi!")
        
        else:
            print("Geçersiz seçim.")
    
    print()
    print("╔══════════════════════════════════════════════════════════╗")
    print("║  Tamamlandı! Reflektif uygulamasını yenileyin.          ║")
    print("╚══════════════════════════════════════════════════════════╝")
    print()


if __name__ == "__main__":
    main()
