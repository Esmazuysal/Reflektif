# Reflektif

TÜBİTAK 2209-A — Alzheimer hastaları için mobil uygulama + C# backend.

## Yapı

| Klasör | Teknoloji |
|--------|-----------|
| `/` (kök) | React Native (Expo) — iOS + Android |
| `api/Reflektif.Api` | **C# ASP.NET Core** + **SQLite** (rapor: C# / SQL) |

Python analiz mikroservisi sonraki adım.

## 1) Backend’i başlat

```bash
cd api/Reflektif.Api
dotnet run --launch-profile http
```

- API: `http://localhost:5196`
- Sağlık: `http://localhost:5196/api/health`
- DB dosyası: `api/Reflektif.Api/reflektif.db`

## 2) Mobil uygulamayı başlat

```bash
cd ~/Desktop/APP
npm start
```

Simülatör → `localhost:5196`. Gerçek telefonda `src/api/config.ts` içindeki IP’yi güncelleyin.

## Kullanım

1. Ana ekranda hasta adını girip kaydedin (sabit isim yok).
2. Profil’den düzenleyin, yakın ekleyin.
3. İlaçlar’dan ilaç ekleyin.
4. Sağlık’ta “Örnek saat verisi” ile DB’ye nabız yazın (gerçek saat sonra).
