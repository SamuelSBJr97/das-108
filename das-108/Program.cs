using das108api.Models;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseInMemoryDatabase("VeiculosDb"));

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Seed data
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Perfis.AddRange(
        new EmpresaPerfil { EmpresaPerfilId = 0, PerfilDescricao = "(SEM PERFIL)" },
        new EmpresaPerfil { EmpresaPerfilId = 10, PerfilDescricao = "STI TESTE 1" }
    );
    // Adiciona 10 mil veículos de teste
    var veiculos = new List<VeiculoPerfil>();
    for (int i = 1; i <= 10000; i++)
    {
        veiculos.Add(new VeiculoPerfil
        {
            VeiculoId = i,
            Placa = $"ABC{i:D4}",
            Serie = $"S{i:D5}",
            PerfilId = (i % 2 == 0) ? 0 : 10
        });
    }
    db.Veiculos.AddRange(veiculos);
    db.SaveChanges();
}

app.UseSwagger();
app.UseSwaggerUI();

app.MapGet("/api/veiculos", async (AppDbContext db, HttpContext ctx) =>
{
    var perfis = await db.Perfis.ToListAsync();
    var veiculos = await db.Veiculos.ToListAsync();
    // Para cada veículo, cria um array de perfis no formato [{ id, nome, checked }]
    var result = veiculos.Select(v => new {
        VeiculoId = v.VeiculoId,
        Placa = v.Placa,
        Serie = v.Serie,
        PerfilId = v.PerfilId,
        Perfis = perfis.Select(p => new {
            Id = p.EmpresaPerfilId,
            Nome = p.PerfilDescricao,
            Checked = v.PerfilId == p.EmpresaPerfilId
        }).ToArray()
    });
    return Results.Ok(result);
});

app.MapGet("/api/perfis", async (AppDbContext db) =>
    await db.Perfis.ToListAsync()
);

app.MapPut("/api/veiculos/{id}", async (int id, VeiculoPerfil input, AppDbContext db) =>
{
    var veiculo = await db.Veiculos.FindAsync(id);
    if (veiculo is null) return Results.NotFound();
    veiculo.Placa = input.Placa;
    veiculo.Serie = input.Serie;
    veiculo.PerfilId = input.PerfilId;
    await db.SaveChangesAsync();
    return Results.Ok(veiculo);
});

app.MapPost("/api/veiculos/batch", async (List<VeiculoPerfil> veiculos, AppDbContext db) =>
{
    foreach (var v in veiculos)
    {
        var veiculo = await db.Veiculos.FindAsync(v.VeiculoId);
        if (veiculo != null)
        {
            veiculo.Placa = v.Placa;
            veiculo.Serie = v.Serie;
            veiculo.PerfilId = v.PerfilId;
        }
    }
    await db.SaveChangesAsync();
    return Results.Ok();
});

app.UseDefaultFiles();
app.UseStaticFiles();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

var summaries = new[]
{
    "Freezing", "Bracing", "Chilly", "Cool", "Mild", "Warm", "Balmy", "Hot", "Sweltering", "Scorching"
};

app.MapGet("/weatherforecast", () =>
{
    var forecast =  Enumerable.Range(1, 5).Select(index =>
        new WeatherForecast
        (
            DateOnly.FromDateTime(DateTime.Now.AddDays(index)),
            Random.Shared.Next(-20, 55),
            summaries[Random.Shared.Next(summaries.Length)]
        ))
        .ToArray();
    return forecast;
})
.WithName("GetWeatherForecast");

app.Run();

record WeatherForecast(DateOnly Date, int TemperatureC, string? Summary)
{
    public int TemperatureF => 32 + (int)(TemperatureC / 0.5556);
}
