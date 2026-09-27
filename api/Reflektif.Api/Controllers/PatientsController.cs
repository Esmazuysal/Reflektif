using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Reflektif.Api.Data;
using Reflektif.Api.Dtos;
using Reflektif.Api.Models;

namespace Reflektif.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PatientsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<object>>> GetAll()
    {
        var list = await db.Patients
            .OrderByDescending(p => p.CreatedAt)
            .Select(p => new
            {
                p.Id,
                p.FullName,
                p.BirthYear,
                p.Stage,
                p.CaregiverName,
                p.Notes,
                p.CreatedAt,
                ContactCount = p.Contacts.Count,
                MedicationCount = p.Medications.Count,
            })
            .ToListAsync();
        return Ok(list);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<object>> GetOne(Guid id)
    {
        var p = await db.Patients
            .Include(x => x.Contacts)
            .Include(x => x.Medications)
            .Include(x => x.SafeZone)
            .FirstOrDefaultAsync(x => x.Id == id);

        if (p is null) return NotFound();
        return Ok(MapPatient(p));
    }

    [HttpGet("active")]
    public async Task<ActionResult<object>> GetActive()
    {
        var p = await db.Patients
            .Include(x => x.Contacts)
            .Include(x => x.Medications)
            .Include(x => x.SafeZone)
            .OrderByDescending(x => x.CreatedAt)
            .FirstOrDefaultAsync();

        if (p is null) return NotFound(new { message = "Henüz hasta kaydı yok." });
        return Ok(MapPatient(p));
    }

    [HttpPost]
    public async Task<ActionResult<object>> Create([FromBody] PatientCreateDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.FullName))
            return BadRequest(new { message = "Hasta adı zorunlu." });

        var patient = new Patient
        {
            FullName = dto.FullName.Trim(),
            BirthYear = dto.BirthYear,
            Stage = dto.Stage?.Trim() ?? "",
            CaregiverName = dto.CaregiverName?.Trim() ?? "",
            Notes = dto.Notes?.Trim() ?? "",
            SafeZone = new SafeZone
            {
                Name = "Ev Güvenli Alanı",
                CenterLat = 40.7654,
                CenterLng = 29.9407,
                RadiusMeters = 400,
                LastAddress = "",
                InSafeZone = true,
                LocationUpdatedAt = DateTime.UtcNow,
            },
        };

        db.Patients.Add(patient);
        await db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetOne), new { id = patient.Id }, MapPatient(patient));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<object>> Update(Guid id, [FromBody] PatientUpdateDto dto)
    {
        var p = await db.Patients
            .Include(x => x.Contacts)
            .Include(x => x.Medications)
            .Include(x => x.SafeZone)
            .FirstOrDefaultAsync(x => x.Id == id);
        if (p is null) return NotFound();

        p.FullName = dto.FullName.Trim();
        p.BirthYear = dto.BirthYear;
        p.Stage = dto.Stage?.Trim() ?? "";
        p.CaregiverName = dto.CaregiverName?.Trim() ?? "";
        p.Notes = dto.Notes?.Trim() ?? "";
        await db.SaveChangesAsync();
        return Ok(MapPatient(p));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var p = await db.Patients.FindAsync(id);
        if (p is null) return NotFound();
        db.Patients.Remove(p);
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("{id:guid}/contacts")]
    public async Task<ActionResult<object>> AddContact(Guid id, [FromBody] ContactCreateDto dto)
    {
        var p = await db.Patients.FindAsync(id);
        if (p is null) return NotFound();

        if (dto.IsPrimary)
        {
            var others = await db.Contacts.Where(c => c.PatientId == id && c.IsPrimary).ToListAsync();
            foreach (var o in others) o.IsPrimary = false;
        }

        var contact = new EmergencyContact
        {
            PatientId = id,
            Name = dto.Name.Trim(),
            Relation = dto.Relation.Trim(),
            Phone = dto.Phone.Trim(),
            IsPrimary = dto.IsPrimary,
        };
        db.Contacts.Add(contact);
        await db.SaveChangesAsync();
        return Ok(MapContact(contact));
    }

    [HttpDelete("contacts/{contactId:guid}")]
    public async Task<IActionResult> DeleteContact(Guid contactId)
    {
        var c = await db.Contacts.FindAsync(contactId);
        if (c is null) return NotFound();
        db.Contacts.Remove(c);
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("{id:guid}/medications")]
    public async Task<ActionResult<object>> AddMedication(Guid id, [FromBody] MedicationCreateDto dto)
    {
        var p = await db.Patients.FindAsync(id);
        if (p is null) return NotFound();

        var times = dto.Times.Where(t => !string.IsNullOrWhiteSpace(t)).Select(t => t.Trim()).ToList();
        if (times.Count == 0) times.Add("09:00");

        var med = new Medication
        {
            PatientId = id,
            Name = dto.Name.Trim(),
            Dose = dto.Dose.Trim(),
            TimesCsv = string.Join(",", times),
            TakenTodayCsv = string.Join(",", times.Select(_ => "0")),
        };
        db.Medications.Add(med);
        await db.SaveChangesAsync();
        return Ok(MapMedication(med));
    }

    [HttpPut("medications/{medId:guid}/taken")]
    public async Task<ActionResult<object>> UpdateTaken(Guid medId, [FromBody] MedicationTakenDto dto)
    {
        var med = await db.Medications.FindAsync(medId);
        if (med is null) return NotFound();
        med.TakenTodayCsv = string.Join(",", dto.TakenToday.Select(t => t ? "1" : "0"));
        await db.SaveChangesAsync();
        return Ok(MapMedication(med));
    }

    [HttpDelete("medications/{medId:guid}")]
    public async Task<IActionResult> DeleteMedication(Guid medId)
    {
        var med = await db.Medications.FindAsync(medId);
        if (med is null) return NotFound();
        db.Medications.Remove(med);
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPut("{id:guid}/safe-zone")]
    public async Task<ActionResult<object>> UpsertSafeZone(Guid id, [FromBody] SafeZoneUpsertDto dto)
    {
        var p = await db.Patients.Include(x => x.SafeZone).FirstOrDefaultAsync(x => x.Id == id);
        if (p is null) return NotFound();

        if (p.SafeZone is null)
        {
            p.SafeZone = new SafeZone { PatientId = id };
            db.SafeZones.Add(p.SafeZone);
        }

        p.SafeZone.Name = dto.Name.Trim();
        p.SafeZone.CenterLat = dto.CenterLat;
        p.SafeZone.CenterLng = dto.CenterLng;
        p.SafeZone.RadiusMeters = dto.RadiusMeters;
        p.SafeZone.LastAddress = dto.LastAddress?.Trim() ?? p.SafeZone.LastAddress;
        p.SafeZone.LastLat = dto.LastLat ?? p.SafeZone.LastLat;
        p.SafeZone.LastLng = dto.LastLng ?? p.SafeZone.LastLng;
        p.SafeZone.InSafeZone = dto.InSafeZone;
        p.SafeZone.LocationUpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(MapSafeZone(p.SafeZone));
    }

    [HttpGet("{id:guid}/health/latest")]
    public async Task<ActionResult<object>> LatestHealth(Guid id)
    {
        var exists = await db.Patients.AnyAsync(p => p.Id == id);
        if (!exists) return NotFound();

        var h = await db.HealthReadings
            .Where(x => x.PatientId == id)
            .OrderByDescending(x => x.RecordedAt)
            .FirstOrDefaultAsync();

        if (h is null) return NotFound(new { message = "Sağlık kaydı yok." });
        return Ok(MapHealth(h));
    }

    [HttpPost("{id:guid}/health")]
    public async Task<ActionResult<object>> UpsertHealth(Guid id, [FromBody] HealthUpsertDto dto)
    {
        var exists = await db.Patients.AnyAsync(p => p.Id == id);
        if (!exists) return NotFound();

        var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
        var samplesJson = JsonSerializer.Serialize(dto.Samples ?? [], options);
        var reading = new HealthReading
        {
            PatientId = id,
            Source = dto.Source ?? "mock",
            DeviceName = dto.DeviceName ?? "Xiaomi Watch S4",
            Model = dto.Model ?? "M2425W1",
            BatteryPercent = dto.BatteryPercent,
            HeartRateCurrent = dto.HeartRateCurrent,
            HeartRateResting = dto.HeartRateResting,
            HeartRateMin = dto.HeartRateMin,
            HeartRateMax = dto.HeartRateMax,
            HeartRateStatus = dto.HeartRateStatus,
            HeartRateSamplesJson = samplesJson,
            StepsToday = dto.StepsToday,
            StepsGoal = dto.StepsGoal,
            SleepHours = dto.SleepHours,
            SleepQuality = dto.SleepQuality,
            Spo2Percent = dto.Spo2Percent,
            Spo2Status = dto.Spo2Status,
            Calories = dto.Calories,
            StressLevel = dto.StressLevel,
            StressLabel = dto.StressLabel,
            RecordedAt = DateTime.UtcNow,
        };
        db.HealthReadings.Add(reading);
        await db.SaveChangesAsync();
        return Ok(MapHealth(reading));
    }

    private static object MapPatient(Patient p) => new
    {
        p.Id,
        p.FullName,
        p.BirthYear,
        p.Stage,
        p.CaregiverName,
        p.Notes,
        p.CreatedAt,
        Contacts = p.Contacts.Select(MapContact).ToList(),
        Medications = p.Medications.Select(MapMedication).ToList(),
        SafeZone = p.SafeZone is null ? null : MapSafeZone(p.SafeZone),
    };

    private static object MapContact(EmergencyContact c) => new
    {
        c.Id,
        c.Name,
        c.Relation,
        c.Phone,
        c.IsPrimary,
    };

    private static object MapMedication(Medication m)
    {
        var times = string.IsNullOrWhiteSpace(m.TimesCsv)
            ? new List<string>()
            : m.TimesCsv.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToList();
        var taken = string.IsNullOrWhiteSpace(m.TakenTodayCsv)
            ? times.Select(_ => false).ToList()
            : m.TakenTodayCsv.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Select(x => x == "1").ToList();
        while (taken.Count < times.Count) taken.Add(false);

        return new
        {
            m.Id,
            m.Name,
            m.Dose,
            Times = times,
            TakenToday = taken,
        };
    }

    private static object MapSafeZone(SafeZone z) => new
    {
        z.Id,
        z.Name,
        z.CenterLat,
        z.CenterLng,
        z.RadiusMeters,
        z.LastAddress,
        z.LastLat,
        z.LastLng,
        z.InSafeZone,
        z.LocationUpdatedAt,
    };

    private static object MapHealth(HealthReading h)
    {
        List<HeartSampleDto> samples;
        try
        {
            var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            samples = JsonSerializer.Deserialize<List<HeartSampleDto>>(h.HeartRateSamplesJson, options) ?? [];
        }
        catch
        {
            samples = [];
        }

        return new
        {
            source = h.Source,
            deviceName = h.DeviceName,
            model = h.Model,
            lastSyncAt = h.RecordedAt,
            batteryPercent = h.BatteryPercent,
            heartRate = new
            {
                current = h.HeartRateCurrent,
                resting = h.HeartRateResting,
                min = h.HeartRateMin,
                max = h.HeartRateMax,
                status = h.HeartRateStatus,
                samples,
            },
            steps = new { today = h.StepsToday, goal = h.StepsGoal },
            sleep = new { hours = h.SleepHours, quality = h.SleepQuality },
            spo2 = new { percent = h.Spo2Percent, status = h.Spo2Status },
            calories = h.Calories,
            stress = new { level = h.StressLevel, label = h.StressLabel },
        };
    }
}
