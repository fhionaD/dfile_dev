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
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

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
// Configure the HTTP request pipeline.
// Enable Swagger in all environments for debugging
app.UseSwagger();
app.UseSwaggerUI();

// app.UseHttpsRedirection(); // Disabled for troubleshooting 404s on HTTP host
app.UseDefaultFiles(); // Serve index.html for /
app.UseStaticFiles(); // Serve frontend files from wwwroot
app.UseCors("AllowAll");

app.MapGet("/debug", () => Results.Ok($"App Running. Env: {app.Environment.EnvironmentName}"));


app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/api/health", () => Results.Ok("API is Healthy"));

app.MapControllers();

// Add this immediately after MapControllers
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
