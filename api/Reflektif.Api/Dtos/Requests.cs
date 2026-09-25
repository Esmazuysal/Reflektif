namespace Reflektif.Api.Dtos;

public record PatientCreateDto(
    string FullName,
    int? BirthYear,
    string? Stage,
    string? CaregiverName,
    string? Notes);

public record PatientUpdateDto(
    string FullName,
    int? BirthYear,
    string? Stage,
    string? CaregiverName,
    string? Notes);

public record ContactCreateDto(
    string Name,
    string Relation,
    string Phone,
    bool IsPrimary);

public record MedicationCreateDto(
    string Name,
    string Dose,
    List<string> Times);

public record MedicationTakenDto(List<bool> TakenToday);

public record SafeZoneUpsertDto(
    string Name,
    double CenterLat,
    double CenterLng,
    int RadiusMeters,
    string? LastAddress,
    double? LastLat,
    double? LastLng,
    bool InSafeZone);

public record HealthUpsertDto(
    string? Source,
    string? DeviceName,
    string? Model,
    int BatteryPercent,
    int HeartRateCurrent,
    int HeartRateResting,
    int HeartRateMin,
    int HeartRateMax,
    string HeartRateStatus,
    List<HeartSampleDto>? Samples,
    int StepsToday,
    int StepsGoal,
    double SleepHours,
    string SleepQuality,
    int Spo2Percent,
    string Spo2Status,
    int Calories,
    int StressLevel,
    string StressLabel);

public record HeartSampleDto(int Bpm, string RecordedAt);
