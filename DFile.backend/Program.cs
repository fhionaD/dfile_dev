using DFile.backend.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Database Context
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection"), sqlOptions => 
    {
        sqlOptions.EnableRetryOnFailure(
            maxRetryCount: 5,
            maxRetryDelay: TimeSpan.FromSeconds(30),
            errorNumbersToAdd: null);
    }));

// Authentication
var key = Encoding.ASCII.GetBytes(builder.Configuration["Jwt:Key"] ?? "superSecretKey12345678901234567890"); // Use env var in prod
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(key),
        ValidateIssuer = false,
        ValidateAudience = false
    };
});

// CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll",
        builder => builder
        .AllowAnyOrigin()
        .AllowAnyMethod()
        .AllowAnyHeader());
});

var app = builder.Build();

// Configure the HTTP request pipeline.
// Enable Swagger in all environments for debugging
app.UseSwagger();
app.UseSwaggerUI();

// CORS must be before controllers
app.UseCors("AllowAll");

// Authentication & Authorization must come before MapControllers
app.UseAuthentication();
app.UseAuthorization();

// Map all API routes and health checks FIRST (before static files)
app.MapGet("/debug", () => Results.Ok($"App Running. Env: {app.Environment.EnvironmentName}"));
app.MapGet("/api/health", () => Results.Ok("API is Healthy"));
app.MapGet("/api/db-test", (AppDbContext db) => 
{
    try
    {
        if (db.Database.CanConnect())
        {
            return Results.Ok("Database connection successful.");
        }
        else
        {
            return Results.Problem("Database connection failed (CanConnect returned false). Check logs for details.");
        }
    }
    catch (Exception ex)
    {
        return Results.Problem($"Database connection error: {ex.Message}");
    }
});

// Map controllers (API routes from AuthController, etc.)
app.MapControllers();

// app.UseHttpsRedirection(); // Disabled for troubleshooting 404s on HTTP host
// Only then serve static files and fallback for SPA
app.UseDefaultFiles(); // Serve index.html for /
app.UseStaticFiles(); // Serve frontend files from wwwroot

// Map fallback only for non-API, non-swagger routes (SPA routing)
app.MapFallbackToFile("index.html");

// Seed Database
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var context = services.GetRequiredService<AppDbContext>();
        // Check connectivity first
        if (context.Database.CanConnect())
        {
            Console.WriteLine("Database connection successful.");
            DbInitializer.Initialize(context);
        }
        else
        {
             Console.WriteLine("WARNING: Could not connect to the database.");
        }
    }
    catch (Exception ex)
    {
        var logger = services.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "CRITICAL ERROR: An error occurred creating the DB.");
        Console.WriteLine($"CRITICAL ERROR: {ex.Message}");
        if (ex.InnerException != null) Console.WriteLine($"Inner Exception: {ex.InnerException.Message}");
    }
}

app.Run();
