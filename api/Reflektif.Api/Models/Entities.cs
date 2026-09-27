namespace Reflektif.Api.Models;

public class Patient
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string FullName { get; set; } = string.Empty;
    public int? BirthYear { get; set; }
    public string Stage { get; set; } = string.Empty;
    public string CaregiverName { get; set; } = string.Empty;
    public string Notes { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public SafeZone? SafeZone { get; set; }
    public List<EmergencyContact> Contacts { get; set; } = [];
    public List<Medication> Medications { get; set; } = [];
    public List<HealthReading> HealthReadings { get; set; } = [];
    public List<AlarmEvent> Alarms { get; set; } = [];
}

/// <summary>Kritik sağlık veya güvenli alan ihlali kaydı.</summary>
public class AlarmEvent
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid PatientId { get; set; }
    public Patient? Patient { get; set; }
    /// <summary>health_critical | safe_zone_exit</summary>
    public string Type { get; set; } = string.Empty;
    /// <summary>info | warning | critical</summary>
    public string Severity { get; set; } = "warning";
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string PayloadJson { get; set; } = "{}";
    public bool Acknowledged { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>Yakınlara giden uyarı denemesi (SMS/push sonraki adım).</summary>
public class NotificationLog
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid AlarmEventId { get; set; }
    public AlarmEvent? AlarmEvent { get; set; }
    public Guid? ContactId { get; set; }
    public string Channel { get; set; } = "local_push";
    public string Target { get; set; } = string.Empty;
    public string Status { get; set; } = "queued";
    public string Detail { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class EmergencyContact
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid PatientId { get; set; }
    public Patient? Patient { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Relation { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public bool IsPrimary { get; set; }
}

public class Medication
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid PatientId { get; set; }
    public Patient? Patient { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Dose { get; set; } = string.Empty;
    /// <summary>Virgülle ayrılmış saatler, örn. "09:00,21:00"</summary>
    public string TimesCsv { get; set; } = string.Empty;
    /// <summary>Bugün alındı mı — Times ile aynı uzunlukta 0/1 CSV</summary>
    public string TakenTodayCsv { get; set; } = string.Empty;
}

public class SafeZone
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid PatientId { get; set; }
    public Patient? Patient { get; set; }
    public string Name { get; set; } = "Ev Güvenli Alanı";
    public double CenterLat { get; set; }
    public double CenterLng { get; set; }
    public int RadiusMeters { get; set; } = 400;
    public string LastAddress { get; set; } = string.Empty;
    public double? LastLat { get; set; }
    public double? LastLng { get; set; }
    public bool InSafeZone { get; set; } = true;
    public DateTime? LocationUpdatedAt { get; set; }
}

public class HealthReading
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid PatientId { get; set; }
    public Patient? Patient { get; set; }
    public string Source { get; set; } = "mock";
    public string DeviceName { get; set; } = "Xiaomi Watch S4";
    public string Model { get; set; } = "M2425W1";
    public int BatteryPercent { get; set; }
    public int HeartRateCurrent { get; set; }
    public int HeartRateResting { get; set; }
    public int HeartRateMin { get; set; }
    public int HeartRateMax { get; set; }
    public string HeartRateStatus { get; set; } = "normal";
    public string HeartRateSamplesJson { get; set; } = "[]";
    public int StepsToday { get; set; }
    public int StepsGoal { get; set; } = 5000;
    public double SleepHours { get; set; }
    public string SleepQuality { get; set; } = "orta";
    public int Spo2Percent { get; set; }
    public string Spo2Status { get; set; } = "normal";
    public int Calories { get; set; }
    public int StressLevel { get; set; }
    public string StressLabel { get; set; } = "düşük";
    public DateTime RecordedAt { get; set; } = DateTime.UtcNow;
}
