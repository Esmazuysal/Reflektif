using Microsoft.EntityFrameworkCore;
using Reflektif.Api.Data;
using Reflektif.Api.Models;

namespace Reflektif.Api.Services;

public static class AlarmThresholds
{
    public const int HeartRateHigh = 120;
    public const int HeartRateLow = 45;
    public const int Spo2Low = 90;
}

public class AlarmEvaluator(AppDbContext db, ILogger<AlarmEvaluator> log)
{
    public async Task<List<AlarmEvent>> EvaluateHealthAsync(Guid patientId, HealthReading reading)
    {
        var created = new List<AlarmEvent>();
        var status = (reading.HeartRateStatus ?? "").ToLowerInvariant();

        if (reading.HeartRateCurrent >= AlarmThresholds.HeartRateHigh || status == "high")
        {
            created.Add(await RaiseAsync(
                patientId,
                "health_critical",
                "critical",
                "Kritik nabız yüksek",
                $"Nabız {reading.HeartRateCurrent} bpm — eşik {AlarmThresholds.HeartRateHigh}+",
                new { kind = "heart_rate_high", bpm = reading.HeartRateCurrent }));
        }
        else if (reading.HeartRateCurrent > 0 &&
                 (reading.HeartRateCurrent <= AlarmThresholds.HeartRateLow || status == "low"))
        {
            created.Add(await RaiseAsync(
                patientId,
                "health_critical",
                "critical",
                "Kritik nabız düşük",
                $"Nabız {reading.HeartRateCurrent} bpm — eşik {AlarmThresholds.HeartRateLow}-",
                new { kind = "heart_rate_low", bpm = reading.HeartRateCurrent }));
        }

        if (reading.Spo2Percent > 0 &&
            (reading.Spo2Percent < AlarmThresholds.Spo2Low ||
             (reading.Spo2Status ?? "").ToLowerInvariant() == "low"))
        {
            created.Add(await RaiseAsync(
                patientId,
                "health_critical",
                "critical",
                "Kritik SpO₂ düşük",
                $"SpO₂ %{reading.Spo2Percent} — eşik %{AlarmThresholds.Spo2Low}",
                new { kind = "spo2_low", spo2 = reading.Spo2Percent }));
        }

        return created;
    }

    public async Task<AlarmEvent?> EvaluateSafeZoneAsync(
        Guid patientId,
        bool wasInZone,
        bool nowInZone,
        SafeZone zone)
    {
        if (wasInZone && !nowInZone)
        {
            return await RaiseAsync(
                patientId,
                "safe_zone_exit",
                "critical",
                "Güvenli alan ihlali",
                $"{zone.Name} dışına çıkıldı. Adres: {(string.IsNullOrWhiteSpace(zone.LastAddress) ? "bilinmiyor" : zone.LastAddress)}",
                new
                {
                    kind = "safe_zone_exit",
                    zone = zone.Name,
                    lat = zone.LastLat,
                    lng = zone.LastLng,
                    address = zone.LastAddress,
                });
        }
        return null;
    }

    private async Task<AlarmEvent> RaiseAsync(
        Guid patientId,
        string type,
        string severity,
        string title,
        string message,
        object payload)
    {
        // Aynı tipte son 10 dk içinde açık alarm varsa yenileme (spam önleme)
        var recent = await db.AlarmEvents
            .Where(a => a.PatientId == patientId
                        && a.Type == type
                        && !a.Acknowledged
                        && a.CreatedAt > DateTime.UtcNow.AddMinutes(-10))
            .OrderByDescending(a => a.CreatedAt)
            .FirstOrDefaultAsync();

        if (recent is not null)
        {
            recent.Message = message;
            recent.PayloadJson = System.Text.Json.JsonSerializer.Serialize(payload);
            recent.CreatedAt = DateTime.UtcNow;
            await db.SaveChangesAsync();
            await NotifyContactsAsync(recent);
            return recent;
        }

        var alarm = new AlarmEvent
        {
            PatientId = patientId,
            Type = type,
            Severity = severity,
            Title = title,
            Message = message,
            PayloadJson = System.Text.Json.JsonSerializer.Serialize(payload),
        };
        db.AlarmEvents.Add(alarm);
        await db.SaveChangesAsync();
        await NotifyContactsAsync(alarm);
        log.LogWarning("ALARM {Type} patient={PatientId}: {Title}", type, patientId, title);
        return alarm;
    }

    private async Task NotifyContactsAsync(AlarmEvent alarm)
    {
        var contacts = await db.Contacts
            .Where(c => c.PatientId == alarm.PatientId)
            .OrderByDescending(c => c.IsPrimary)
            .ToListAsync();

        if (contacts.Count == 0)
        {
            db.NotificationLogs.Add(new NotificationLog
            {
                AlarmEventId = alarm.Id,
                Channel = "local_push",
                Target = "caregiver_app",
                Status = "queued",
                Detail = "Acil kişi yok — yalnızca uygulama bildirimi",
            });
            await db.SaveChangesAsync();
            return;
        }

        foreach (var c in contacts)
        {
            db.NotificationLogs.Add(new NotificationLog
            {
                AlarmEventId = alarm.Id,
                ContactId = c.Id,
                Channel = "local_push",
                Target = $"{c.Name}|{c.Phone}",
                Status = "queued",
                Detail = $"{alarm.Title} → {c.Name} ({c.Relation})",
            });
        }
        await db.SaveChangesAsync();
    }
}
