using DFile.backend.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Collections.Concurrent;
using System.Security.Cryptography;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers(options =>
{
    options.Filters.Add<DFile.backend.Authorization.PermissionAuthorizationFilter>();
}).AddJsonOptions(o =>
{
    o.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
});
builder.Services.AddScoped<DFile.backend.Controllers.RequireTenantFilter>();
builder.Services.AddScoped<DFile.backend.Services.PermissionService>();
builder.Services.AddScoped<DFile.backend.Services.IAuditService, DFile.backend.Services.AuditService>();
builder.Services.AddScoped<DFile.backend.Authorization.PermissionAuthorizationFilter>();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddMemoryCache();

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

// Apply EF Core migrations once at startup (single path — avoids duplicate Migrate() in dev + background).
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

// Configure the HTTP request pipeline.

// 1. Static files FIRST — lets IIS/Kestrel short-circuit for .js/.css/etc.
//    without passing through auth or CORS middleware on every asset request.
//
//    UseDefaultFiles() rewrites directory requests (e.g. /tenant/dashboard/)
//    to /tenant/dashboard/index.html so UseStaticFiles() serves the correct
//    per-page HTML from the Next.js static export — NOT the root index.html.
//    Without this, every hard-refresh falls through to MapFallback and always
//    serves the Home page, causing a visible redirect loop.

// Rewrite Next.js RSC prefetch requests from dot-separated to directory-based paths.
// Next.js 16 client requests: /tenant/dashboard/__next.tenant.dashboard.__PAGE__.txt
// But the static export generates: /tenant/dashboard/__next.tenant/dashboard/__PAGE__.txt
// Without this rewrite, UseStaticFiles returns 404 for all RSC navigation prefetches.
app.Use(async (context, next) =>
{
    var path = context.Request.Path.Value ?? "";
    // Only process __next. prefixed .txt files (RSC payloads)
    var lastSlash = path.LastIndexOf('/');
    if (lastSlash >= 0)
    {
        var fileName = path[(lastSlash + 1)..];
        if (fileName.StartsWith("__next.", StringComparison.Ordinal) && fileName.EndsWith(".txt", StringComparison.Ordinal))
        {
            // Convert dot-separated filename to directory path:
            // __next.tenant.dashboard.__PAGE__.txt → __next.tenant/dashboard/__PAGE__.txt
            // __next.tenant.dashboard.txt → __next.tenant/dashboard.txt
            var withoutExt = fileName[..^4]; // strip .txt
            var parts = withoutExt.Split('.');
            if (parts.Length >= 3) // __next + at least 2 segments
            {
                // First two parts form the directory prefix: __next.tenant
                var dirPrefix = parts[0] + "." + parts[1];
                // Remaining parts form the sub-path
                var subPath = string.Join("/", parts[2..]) + ".txt";
                var basePath = path[..(lastSlash + 1)];
                var rewritten = basePath + dirPrefix + "/" + subPath;

                // Only rewrite if the rewritten file actually exists
                var webRoot = app.Environment.WebRootPath
                    ?? Path.Combine(app.Environment.ContentRootPath, "wwwroot");
                var physicalPath = Path.Combine(webRoot, rewritten.TrimStart('/').Replace('/', Path.DirectorySeparatorChar));
                if (File.Exists(physicalPath))
                {
                    context.Request.Path = rewritten;
                }
            }
        }
    }
    await next();
});

app.UseDefaultFiles();
app.UseStaticFiles(new StaticFileOptions
{
    OnPrepareResponse = ctx =>
    {
        var headers = ctx.Context.Response.Headers;
        var requestPath = ctx.Context.Request.Path.Value ?? "";

        if (requestPath.StartsWith("/_next/static/", StringComparison.OrdinalIgnoreCase))
        {
            // Content-hashed filenames — safe to cache forever in browser and CDN.
            // On redeploy the hash changes, guaranteeing a fresh fetch.
            headers["Cache-Control"] = "public, max-age=31536000, immutable";
        }
        else if (ctx.File.Name.EndsWith(".html", StringComparison.OrdinalIgnoreCase))
        {
            // HTML files must never be served stale — always revalidate so the
            // browser fetches the latest index.html after a redeploy.
            headers["Cache-Control"] = "no-cache, no-store, must-revalidate";
            headers["Pragma"] = "no-cache";
            headers["Expires"] = "0";
        }
        else
        {
            // Other static assets (images, SVGs, fonts, icons) — 1-day cache
            headers["Cache-Control"] = "public, max-age=86400";
        }
    }
});

// 2. Swagger — development only

// Serve uploaded maintenance attachments from /uploads
var uploadsDir = Path.Combine(Directory.GetCurrentDirectory(), "uploads");
Directory.CreateDirectory(uploadsDir);
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(uploadsDir),
    RequestPath = "/uploads"
});

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// 3. CORS before auth/controllers
app.UseCors("AllowAll");

// 4. Authentication & Authorization
app.UseAuthentication();
app.UseAuthorization();

// Global duplicate-submit protection for non-GET API calls.
// Prevents accidental double-click create/update/archive requests across modules.
app.Use(async (context, next) =>
{
    if (!context.Request.Path.StartsWithSegments("/api", StringComparison.OrdinalIgnoreCase))
    {
        await next();
        return;
    }

    var method = context.Request.Method;
    if (HttpMethods.IsGet(method) || HttpMethods.IsHead(method) || HttpMethods.IsOptions(method))
    {
        await next();
        return;
    }

    context.Request.EnableBuffering();
    string body = string.Empty;
    if (context.Request.ContentLength.GetValueOrDefault() > 0)
    {
        using var reader = new StreamReader(context.Request.Body, Encoding.UTF8, detectEncodingFromByteOrderMarks: false, leaveOpen: true);
        body = await reader.ReadToEndAsync();
        context.Request.Body.Position = 0;
    }

    var bodyHash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(body)));
    var userId = context.User.FindFirst("UserId")?.Value
                 ?? context.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                 ?? "anonymous";
    var lockKey = $"{userId}:{method}:{context.Request.Path.Value}:{bodyHash}";

    // Cleanup stale keys.
    var now = DateTime.UtcNow;
    foreach (var item in duplicateRequestLocks)
    {
        if ((now - item.Value).TotalSeconds > 15)
        {
            duplicateRequestLocks.TryRemove(item.Key, out _);
        }
    }

    if (!duplicateRequestLocks.TryAdd(lockKey, now))
    {
        context.Response.StatusCode = StatusCodes.Status409Conflict;
        await context.Response.WriteAsJsonAsync(new { message = "Duplicate request detected. Please wait before submitting again." });
        return;
    }

    try
    {
        await next();
    }
    finally
    {
        _ = Task.Run(async () =>
        {
            await Task.Delay(3000);
            duplicateRequestLocks.TryRemove(lockKey, out _);
        });
    }
});

// 5. Health endpoint (always-on, no sensitive data)
app.MapGet("/api/health", () => Results.Ok("API is Healthy"));

// DB connectivity check — development only
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

// 6. Map controllers (all /api/* routes)
app.MapControllers();

// Explicitly return 404 for any /api/* route that wasn't matched by a controller.
// This prevents the SPA fallback from silently swallowing unmatched API calls
// and returning index.html with HTTP 200, which masks real routing errors.
app.Map("/api/{**rest}", (HttpContext context) =>
    Results.NotFound(new { error = "API endpoint not found", path = context.Request.Path.Value }));

// SPA fallback: serve the correct per-page index.html for Next.js static export.
// With trailingSlash:true, Next.js generates /tenant/dashboard/index.html etc.
// UseDefaultFiles() handles the trailing-slash case (/tenant/dashboard/).
// This fallback handles the non-trailing-slash case (/tenant/dashboard) and
// truly unknown routes (falls back to root index.html for client-side routing).
app.MapFallback(async (HttpContext context) =>
{
    var requestPath = context.Request.Path.Value?.TrimEnd('/') ?? "";
    var webRoot = app.Environment.WebRootPath
        ?? Path.Combine(app.Environment.ContentRootPath, "wwwroot");

    // Try the route-specific index.html first (e.g. /tenant/dashboard → wwwroot/tenant/dashboard/index.html)
    var pageIndex = Path.Combine(webRoot, requestPath.TrimStart('/'), "index.html");
    if (File.Exists(pageIndex))
    {
        context.Response.ContentType = "text/html";
        context.Response.Headers["Cache-Control"] = "no-cache, no-store, must-revalidate";
        context.Response.Headers["Pragma"] = "no-cache";
        context.Response.Headers["Expires"] = "0";
        await context.Response.SendFileAsync(pageIndex);
        return;
    }

    // Fallback to root index.html — unknown routes handled by client-side router
    var rootIndex = Path.Combine(webRoot, "index.html");
    if (File.Exists(rootIndex))
    {
        context.Response.ContentType = "text/html";
        context.Response.Headers["Cache-Control"] = "no-cache, no-store, must-revalidate";
        context.Response.Headers["Pragma"] = "no-cache";
        context.Response.Headers["Expires"] = "0";
        await context.Response.SendFileAsync(rootIndex);
        return;
    }

    // wwwroot/ is generated by `npm run build` in DFile.frontend; without it, "/" has no SPA.
    // In Development, send developers to Swagger instead of a bare 404.
    if (app.Environment.IsDevelopment()
        && string.IsNullOrEmpty(requestPath)
        && HttpMethods.IsGet(context.Request.Method))
    {
        context.Response.Redirect("/swagger");
        return;
    }

    context.Response.StatusCode = 404;
});

app.Run();
