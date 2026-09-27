using Microsoft.EntityFrameworkCore;
using Reflektif.Api.Data;

var builder = WebApplication.CreateBuilder(args);

builder.WebHost.UseUrls("http://0.0.0.0:5196");

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("Default")
                      ?? "Data Source=reflektif.db"));

builder.Services.AddCors(options =>
{
    options.AddPolicy("Mobile", policy =>
        policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod());
});
builder.Services.AddScoped<Reflektif.Api.Services.AlarmEvaluator>();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated();
    // SQLite: yeni tablolar yoksa oluştur (EnsureCreated mevcut DB’yi güncellemez)
    db.Database.ExecuteSqlRaw("""
        CREATE TABLE IF NOT EXISTS "AlarmEvents" (
            "Id" TEXT NOT NULL CONSTRAINT "PK_AlarmEvents" PRIMARY KEY,
            "PatientId" TEXT NOT NULL,
            "Type" TEXT NOT NULL,
            "Severity" TEXT NOT NULL,
            "Title" TEXT NOT NULL,
            "Message" TEXT NOT NULL,
            "PayloadJson" TEXT NOT NULL,
            "Acknowledged" INTEGER NOT NULL,
            "CreatedAt" TEXT NOT NULL,
            CONSTRAINT "FK_AlarmEvents_Patients_PatientId" FOREIGN KEY ("PatientId") REFERENCES "Patients" ("Id") ON DELETE CASCADE
        );
        CREATE TABLE IF NOT EXISTS "NotificationLogs" (
            "Id" TEXT NOT NULL CONSTRAINT "PK_NotificationLogs" PRIMARY KEY,
            "AlarmEventId" TEXT NOT NULL,
            "ContactId" TEXT NULL,
            "Channel" TEXT NOT NULL,
            "Target" TEXT NOT NULL,
            "Status" TEXT NOT NULL,
            "Detail" TEXT NOT NULL,
            "CreatedAt" TEXT NOT NULL,
            CONSTRAINT "FK_NotificationLogs_AlarmEvents_AlarmEventId" FOREIGN KEY ("AlarmEventId") REFERENCES "AlarmEvents" ("Id") ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS "IX_AlarmEvents_PatientId" ON "AlarmEvents" ("PatientId");
        CREATE INDEX IF NOT EXISTS "IX_NotificationLogs_AlarmEventId" ON "NotificationLogs" ("AlarmEventId");
        """);
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("Mobile");
// Mobil geliştirmede HTTP kullanıyoruz; HTTPS yönlendirmesini kapatıyoruz.
app.MapControllers();
app.MapGet("/api/health", () => Results.Ok(new { status = "ok", app = "Reflektif API" }));

app.Run();
