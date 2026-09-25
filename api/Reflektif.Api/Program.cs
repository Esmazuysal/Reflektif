using Microsoft.EntityFrameworkCore;
using Reflektif.Api.Data;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddOpenApi();
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("Default")
                      ?? "Data Source=reflektif.db"));

builder.Services.AddCors(options =>
{
    options.AddPolicy("Mobile", policy =>
        policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod());
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated();
}

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors("Mobile");
// Mobil geliştirmede HTTP kullanıyoruz; HTTPS yönlendirmesini kapatıyoruz.
app.MapControllers();
app.MapGet("/api/health", () => Results.Ok(new { status = "ok", app = "Reflektif API" }));

app.Run();
