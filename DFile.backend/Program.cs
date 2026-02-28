using DFile.backend.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using DFile.backend.Core.Application.Services;
using DFile.backend.Core.Interfaces;
using DFile.backend.Infrastructure;
using DFile.backend.Middleware;
using DFile.backend.Services;
using System.IdentityModel.Tokens.Jwt;

JwtSecurityTokenHandler.DefaultInboundClaimTypeMap.Clear();

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
        ValidateAudience = false,
        RoleClaimType = "role",
        NameClaimType = "sub"
    };
    options.Events = new JwtBearerEvents
    {
        OnAuthenticationFailed = context =>
        {
            Console.WriteLine($"[JWT Auth Failed] {context.Exception.Message}");
            return Task.CompletedTask;
        }
    };
});

builder.Services.AddAuthorization();

// CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll",
        builder => builder
        .AllowAnyOrigin()
        .AllowAnyMethod()
        .AllowAnyHeader());
});

// Dependency Injection
builder.Services.AddScoped<IUnitOfWork, UnitOfWork>();
builder.Services.AddScoped<IAuditService, AuditService>();
builder.Services.AddScoped<IProcurementService, ProcurementService>();
builder.Services.AddScoped<IAssetService, AssetService>();

var app = builder.Build();

// Configure the HTTP request pipeline.
app.UseMiddleware<GlobalExceptionMiddleware>();

// 1. Static files FIRST — lets IIS/Kestrel short-circuit for .js/.css/etc.
//    UseDefaultFiles() rewrites directory requests (e.g. /login/) to /login/index.html
//    so the pre-rendered Next.js HTML for each route is served directly.
app.UseDefaultFiles();
app.UseStaticFiles();

// 2. Swagger (before auth so it's always accessible for debugging)
app.UseSwagger();
app.UseSwaggerUI();

// 3. CORS before auth/controllers
app.UseCors("AllowAll");

// 4. Authentication & Authorization
app.UseAuthentication();

// Diagnostic logging for Auth
app.Use(async (context, next) =>
{
    var path = context.Request.Path.Value;
    if (path != null && path.StartsWith("/api"))
    {
        var user = context.User;
        var isAuthenticated = user.Identity?.IsAuthenticated ?? false;
        var method = context.Request.Method;
        
        if (isAuthenticated)
        {
            var roleClaimsList = user.FindAll("role").Select(c => c.Value).ToList();
            if (!roleClaimsList.Any()) roleClaimsList = user.FindAll(System.Security.Claims.ClaimTypes.Role).Select(c => c.Value).ToList();
            
            var roles = string.Join(", ", roleClaimsList);
            var userId = user.FindFirst("sub")?.Value ?? user.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            var tenantId = user.FindFirst("TenantId")?.Value;
            Console.WriteLine($"[Auth Log] {method} {path} - Authenticated: {isAuthenticated}, User: {userId}, Roles: [{roles}], Tenant: {tenantId}");
        }
        else
        {
            Console.WriteLine($"[Auth Log] {method} {path} - NOT AUTHENTICATED");
        }
    }
    await next();
    
    if (path != null && path.StartsWith("/api"))
    {
        Console.WriteLine($"[Trace Log] {context.Request.Method} {path} - Response: {context.Response.StatusCode}");
        if (context.Response.StatusCode == 403)
        {
            var user = context.User;
            var allClaims = user.Claims.Select(c => $"{c.Type}: {c.Value}").ToList();
            Console.WriteLine($"[Trace Log] 403 DETAIL - All Claims: {string.Join(" | ", allClaims)}");
        }
    }
});

app.UseAuthorization();

// 5. Diagnostic endpoints
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

// 6. Map controllers (all /api/* routes)
app.MapControllers();

// Explicitly return 404 for any /api/* route that wasn't matched by a controller.
// This prevents the SPA fallback from silently swallowing unmatched API calls
// and returning index.html with HTTP 200, which masks real routing errors.
app.Map("/api/{**rest}", (HttpContext context) =>
    Results.NotFound(new { error = "API endpoint not found", path = context.Request.Path.Value }));

// SPA fallback: serve index.html for all non-API, non-swagger, non-static routes
// so that client-side routing (e.g. /dashboard, /login) works on hard-refresh.
app.MapFallbackToFile("index.html");

// Seed Database in background — do NOT block app.Run().
// Blocking startup here causes ANCM startup timeout on IIS hosted deployments.
_ = Task.Run(async () =>
{
    await Task.Delay(2000); // Give the app a moment to fully initialize
    using var scope = app.Services.CreateScope();
    var services = scope.ServiceProvider;
    try
    {
        var context = services.GetRequiredService<AppDbContext>();
        // Ensure Database is created if migration is pending
        // CanConnect() returns false if the DB doesn't exist yet, so we shouldn't rely on it to skip initialization.
        // DbInitializer.Initialize calls Migrate(), which creates the DB safely.
        Console.WriteLine("Applying database migrations and seeding...");
        DbInitializer.Initialize(context);
    }
    catch (Exception ex)
    {
        var logger = services.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "CRITICAL ERROR: An error occurred creating the DB.");
        Console.WriteLine($"CRITICAL ERROR: {ex.Message}");
        if (ex.InnerException != null) Console.WriteLine($"Inner Exception: {ex.InnerException.Message}");
    }
});

app.Run();
