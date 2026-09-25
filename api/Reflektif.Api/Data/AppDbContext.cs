using Microsoft.EntityFrameworkCore;
using Reflektif.Api.Models;

namespace Reflektif.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Patient> Patients => Set<Patient>();
    public DbSet<EmergencyContact> Contacts => Set<EmergencyContact>();
    public DbSet<Medication> Medications => Set<Medication>();
    public DbSet<SafeZone> SafeZones => Set<SafeZone>();
    public DbSet<HealthReading> HealthReadings => Set<HealthReading>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Patient>()
            .HasOne(p => p.SafeZone)
            .WithOne(z => z.Patient!)
            .HasForeignKey<SafeZone>(z => z.PatientId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<EmergencyContact>()
            .HasOne(c => c.Patient)
            .WithMany(p => p.Contacts)
            .HasForeignKey(c => c.PatientId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Medication>()
            .HasOne(m => m.Patient)
            .WithMany(p => p.Medications)
            .HasForeignKey(m => m.PatientId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<HealthReading>()
            .HasOne(h => h.Patient)
            .WithMany(p => p.HealthReadings)
            .HasForeignKey(h => h.PatientId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
