using DFile.backend.Configuration;
using DFile.backend.Data;
using DFile.backend.Serialization;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Collections.Concurrent;
using System.Security.Cryptography;

var builder = WebApplication.CreateBuilder(args);

builder.Services.Configure<RouteOptions>(options =>
{
    options.AppendTrailingSlash = false;
});

// Add services to the container.
builder.Services.AddControllers(options =>
{
    options.Filters.Add<DFile.backend.Authorization.PermissionAuthorizationFilter>();
}).AddJsonOptions(o =>
{
    o.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
    o.JsonSerializerOptions.Converters.Add(new UtcRfc3339DateTimeConverter());
    o.JsonSerializerOptions.Converters.Add(new UtcRfc3339NullableDateTimeConverter());
});
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<DFile.backend.Services.ITenantContext, DFile.backend.Services.HttpTenantContext>();
builder.Services.Configure<PayMongoOptions>(builder.Configuration.GetSection(PayMongoOptions.SectionName));
builder.Services.Configure<PaymentAppOptions>(builder.Configuration.GetSection(PaymentAppOptions.SectionName));
builder.Services.PostConfigure<PayMongoOptions>(opts =>
{
    var cfg = builder.Configuration;
    var sk = cfg["PAYMONGO_SECRET_KEY"];
    var pk = cfg["PAYMONGO_PUBLIC_KEY"];
    var wh = cfg["PAYMONGO_WEBHOOK_SECRET"];
    if (!string.IsNullOrEmpty(sk)) opts.SecretKey = sk;
    if (!string.IsNullOrEmpty(pk)) opts.PublicKey = pk;
    if (!string.IsNullOrEmpty(wh)) opts.WebhookSecret = wh;
});
builder.Services.AddHttpClient<DFile.backend.Services.IPayMongoPaymentService, DFile.backend.Services.PayMongoPaymentService>(client =>
{
    client.BaseAddress = new Uri("https://api.paymongo.com/");
    client.Timeout = TimeSpan.FromSeconds(60);
});
builder.Services.AddScoped<DFile.backend.Controllers.RequireTenantFilter>();
builder.Services.AddScoped<DFile.backend.Services.PermissionService>();
builder.Services.AddScoped<DFile.backend.Services.IAuditService, DFile.backend.Services.AuditService>();
builder.Services.AddScoped<DFile.backend.Services.INotificationService, DFile.backend.Services.NotificationService>();
builder.Services.AddScoped<DFile.backend.Services.IMaintenanceReplacementRegistrationService, DFile.backend.Services.MaintenanceReplacementRegistrationService>();
builder.Services.AddHostedService<DFile.backend.Services.DepreciationReconciliationService>();
builder.Services.AddHostedService<DFile.backend.Services.MaintenanceDueReminderService>();
builder.Services.AddScoped<DFile.backend.Authorization.PermissionAuthorizationFilter>();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddMemoryCache();

// Database Context
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("DefaultConnection"),
        sqlOptions =>
        {
            sqlOptions.EnableRetryOnFailure(
                maxRetryCount: 5,
                maxRetryDelay: TimeSpan.FromSeconds(30),
                errorNumbersToAdd: null
            );
        }
    )
);

// Authentication
var jwtKey = builder.Configuration["Jwt:Key"]
    ?? throw new InvalidOperationException("JWT key is not configured. Set Jwt:Key in appsettings or environment variables.");
var key = Encoding.ASCII.GetBytes(jwtKey);
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

builder.Services.AddAuthorization();

var app = builder.Build();
var duplicateRequestLocks = new ConcurrentDictionary<string, DateTime>();

// Apply EF Core migrations
var skipMigrations = string.Equals(
    Environment.GetEnvironmentVariable("DFILE_SKIP_MIGRATIONS"),
    "1",
    StringComparison.Ordinal);
if (!skipMigrations)
{
    try
    {
        using var migrateScope = app.Services.CreateScope();
        var db = migrateScope.ServiceProvider.GetRequiredService<AppDbContext>();
        var migrateLogger = migrateScope.ServiceProvider.GetRequiredService<ILogger<Program>>();
        if (db.Database.CanConnect())
        {
            migrateLogger.LogInformation("Applying EF Core migrations...");
            db.Database.Migrate();
            migrateLogger.LogInformation("EF Core migrations applied.");
        }
        else
        {
            migrateLogger.LogWarning("Database not reachable; skipping migrations until connection is available.");
        }
    }
    catch (Exception ex)
    {
        var loggerFactory = app.Services.GetRequiredService<ILoggerFactory>();
        var log = loggerFactory.CreateLogger("Program");
        log.LogError(ex, "EF Core migrations failed.");
        throw;
    }
}
else
{
    var loggerFactory = app.Services.GetRequiredService<ILoggerFactory>();
    loggerFactory.CreateLogger("Program").LogWarning(
        "DFILE_SKIP_MIGRATIONS=1: skipping EF Core Migrate() at startup.");
}

// Configure the HTTP request pipeline
app.UseDefaultFiles();

// In Development, do not let browsers cache wwwroot (stale JS after `npm run build` + copy-wwwroot).
var staticFileOptions = new StaticFileOptions();
if (app.Environment.IsDevelopment())
{
    staticFileOptions.OnPrepareResponse = ctx =>
    {
        ctx.Context.Response.Headers.Append("Cache-Control", "no-cache, no-store, must-revalidate");
        ctx.Context.Response.Headers.Append("Pragma", "no-cache");
        ctx.Context.Response.Headers.Append("Expires", "0");
    };
}
app.UseStaticFiles(staticFileOptions);

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// CORS before auth/controllers
app.UseCors("AllowAll");

app.UseAuthentication();
app.UseAuthorization();

// Map controllers and API routes
app.MapControllers();

// Health endpoint
app.MapGet("/api/health", () => Results.Ok("API is Healthy"));

// DB test endpoint
if (app.Environment.IsDevelopment())
{
    app.MapGet("/api/db-test", (AppDbContext db) =>
    {
        try
        {
            return db.Database.CanConnect()
                ? Results.Ok("Database connection successful.")
                : Results.Problem("Database connection failed (CanConnect returned false). Check logs for details.");
        }
        catch (Exception ex)
        {
            return Results.Problem($"Database connection error: {ex.Message}");
        }
    });
}

// Explicit 404 for unmatched /api/* routes
app.Map("/api/{**rest}", (HttpContext context) =>
    Results.NotFound(new { error = "API endpoint not found", path = context.Request.Path.Value }));

app.MapFallback(async (HttpContext context) =>
{
    var requestPath = context.Request.Path.Value?.TrimEnd('/') ?? "";
    var webRoot = app.Environment.WebRootPath
        ?? Path.Combine(app.Environment.ContentRootPath, "wwwroot");

    var trimmed = requestPath.TrimStart('/').TrimEnd('/');
    if (!string.IsNullOrEmpty(trimmed))
    {
        var pageIndex = Path.Combine(webRoot, trimmed, "index.html");
        if (File.Exists(pageIndex))
        {
            if (app.Environment.IsDevelopment())
            {
                context.Response.Headers.Append("Cache-Control", "no-cache, no-store, must-revalidate");
            }
            context.Response.ContentType = "text/html";
            await context.Response.SendFileAsync(pageIndex);
            return;
        }

        // Next.js static export often emits flat `register.html` instead of `register/index.html`.
        var flatPage = Path.Combine(webRoot, trimmed + ".html");
        if (File.Exists(flatPage))
        {
            if (app.Environment.IsDevelopment())
            {
                context.Response.Headers.Append("Cache-Control", "no-cache, no-store, must-revalidate");
            }
            context.Response.ContentType = "text/html";
            await context.Response.SendFileAsync(flatPage);
            return;
        }
    }

    var rootIndex = Path.Combine(webRoot, "index.html");
    if (File.Exists(rootIndex))
    {
        if (app.Environment.IsDevelopment())
        {
            context.Response.Headers.Append("Cache-Control", "no-cache, no-store, must-revalidate");
        }
        context.Response.ContentType = "text/html";
        await context.Response.SendFileAsync(rootIndex);
        return;
    }

    context.Response.StatusCode = 404;
});

app.Run();