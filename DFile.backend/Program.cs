using DFile.backend.Configuration;
using DFile.backend.Data;
using DFile.backend.Serialization;
using DFile.backend.Models;
using DFile.backend.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Security.Cryptography;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.Extensions.FileProviders;

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
builder.Services.AddScoped<DFile.backend.Services.IAuditService, DFile.backend.Services.AuditService>();
builder.Services.AddScoped<DFile.backend.Services.INotificationService, DFile.backend.Services.NotificationService>();
builder.Services.AddScoped<DFile.backend.Services.IMaintenanceReplacementRegistrationService, DFile.backend.Services.MaintenanceReplacementRegistrationService>();
builder.Services.AddHostedService<DFile.backend.Services.DepreciationReconciliationService>();
builder.Services.AddHostedService<DFile.backend.Services.MaintenanceDueReminderService>();
builder.Services.AddHostedService<DFile.backend.Services.SubscriptionExpirationService>();
builder.Services.AddScoped<DFile.backend.Authorization.PermissionAuthorizationFilter>();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddMemoryCache();

// SMTP EMAIL CONFIGURATION
builder.Services.Configure<SmtpSettings>(
    builder.Configuration.GetSection("SmtpSettings"));

builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddScoped<ILoginAuditService, LoginAuditService>();
builder.Services.AddSingleton<DFile.backend.Services.IEmailEncryptionService, DFile.backend.Services.EmailEncryptionService>();

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
var jwtKey = builder.Configuration["Jwt:Key"] ?? "";
var jwtKeyMissing = string.IsNullOrWhiteSpace(jwtKey);
if (jwtKeyMissing)
{
    if (builder.Environment.IsDevelopment())
    {
        // In development only: fall back so the app can start without secrets configured.
        // Auth will be non-functional (all tokens will be rejected / mismatch). Use dotnet user-secrets.
        jwtKey = new string('0', 64);
    }
    else
    {
        // In production: refuse to start. A missing JWT key means EVERY login returns HTTP 500.
        // This 500.30 is intentional — it is far easier to diagnose than a silent auth failure.
        // Fix: ensure the JWT__KEY GitHub secret is set and the web.config injection step succeeded.
        throw new InvalidOperationException(
            "FATAL: Jwt:Key is not configured. " +
            "Set the JWT__KEY GitHub secret and verify the workflow web.config injection step completed successfully. " +
            "Check /api/diag for jwt_key_len:0 to confirm the secret is missing.");
    }
}

// Email Encryption key guard — mirrors the Jwt:Key guard above.
// A missing key causes every endpoint that touches User.Email/EmailHash to return HTTP 500.
// Fix: ensure the EMAILENCRYPTION__KEY GitHub secret is set and the web.config injection step succeeded.
var emailEncKey = builder.Configuration["EmailEncryption:Key"] ?? "";
if (string.IsNullOrWhiteSpace(emailEncKey))
{
    if (!builder.Environment.IsDevelopment())
    {
        throw new InvalidOperationException(
            "FATAL: EmailEncryption:Key is not configured. " +
            "Set the EMAILENCRYPTION__KEY GitHub secret and verify the workflow web.config injection step completed successfully. " +
            "Check /api/diag for email_enc_configured:false to confirm the secret is missing.");
    }
    // Development: EmailEncryptionService already throws a descriptive error on its own — no extra guard needed.
}
var key = Encoding.ASCII.GetBytes(jwtKey);
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = !builder.Environment.IsDevelopment();
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(key),
        ValidateIssuer = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidateAudience = true,
        ValidAudience = builder.Configuration["Jwt:Audience"]
    };
});

// CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", corsBuilder =>
    {
        if (builder.Environment.IsDevelopment())
        {
            corsBuilder.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader();
        }
        else
        {
            var frontendOrigin = builder.Configuration["AllowedOrigins:Frontend"] ?? "";
            if (!string.IsNullOrWhiteSpace(frontendOrigin))
            {
                corsBuilder.WithOrigins(frontendOrigin).AllowAnyMethod().AllowAnyHeader();
            }
            else
            {
                // AllowedOrigins:Frontend is not configured.
                // For same-host deployments (frontend in wwwroot) the browser sends no Origin header,
                // so CORS is irrelevant. AllowAnyOrigin is safe in that scenario.
                // If the frontend is hosted separately, set AllowedOrigins__Frontend in GitHub Secrets.
                var startupLogger = Microsoft.Extensions.Logging.LoggerFactory
                    .Create(lb => lb.AddConsole())
                    .CreateLogger("CORS");
                startupLogger.LogWarning(
                    "CORS: AllowedOrigins:Frontend is not set. Defaulting to AllowAnyOrigin. " +
                    "Set AllowedOrigins__Frontend in GitHub Secrets if the frontend is on a separate host.");
                corsBuilder.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader();
            }
        }
    });
});

builder.Services.AddAuthorization();

builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();
});

var app = builder.Build();

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
        migrateLogger.LogInformation("Applying EF Core migrations...");
        db.Database.Migrate();
        migrateLogger.LogInformation("EF Core migrations applied successfully.");
    }
    catch (Exception ex)
    {
        var loggerFactory = app.Services.GetRequiredService<ILoggerFactory>();
        var log = loggerFactory.CreateLogger("Program");
        log.LogError(ex, "EF Core migrations failed — app will not start to prevent running against a stale schema.");
        throw;
    }
}
else
{
    var loggerFactory = app.Services.GetRequiredService<ILoggerFactory>();
    loggerFactory.CreateLogger("Program").LogWarning(
        "DFILE_SKIP_MIGRATIONS=1: skipping EF Core Migrate() at startup.");
}

// Encrypt any existing plaintext User.Email rows that have not yet been migrated
// (EmailHash IS NULL means the row was created before encryption was introduced).
_ = Task.Run(async () =>
{
    await Task.Delay(3000); // let the app fully initialise
    try
    {
        using var encScope = app.Services.CreateScope();
        var db = encScope.ServiceProvider.GetRequiredService<DFile.backend.Data.AppDbContext>();
        var encSvc = encScope.ServiceProvider.GetRequiredService<DFile.backend.Services.IEmailEncryptionService>();
        var encLogger = encScope.ServiceProvider.GetRequiredService<ILogger<DFile.backend.Data.AppDbContext>>();

        var pending = await db.Users
            .Where(u => u.EmailHash == null && u.Email != null && u.Email != string.Empty)
            .ToListAsync();

        if (pending.Count == 0)
        {
            encLogger.LogInformation("Email encryption migration: no unencrypted rows found.");
            return;
        }

        encLogger.LogInformation("Email encryption migration: encrypting {Count} existing user email(s)...", pending.Count);
        foreach (var u in pending)
        {
            var plain = u.Email.Trim().ToLowerInvariant();
            u.Email = encSvc.Encrypt(plain);
            u.EmailHash = encSvc.Hash(plain);
        }
        await db.SaveChangesAsync();
        encLogger.LogInformation("Email encryption migration: completed successfully.");
    }
    catch (Exception ex)
    {
        var loggerFactory2 = app.Services.GetRequiredService<ILoggerFactory>();
        loggerFactory2.CreateLogger("Program")
            .LogError(ex, "Email encryption migration failed. Existing plaintext emails may remain unencrypted.");
    }
});

// Seed initial test data — development only
if (app.Environment.IsDevelopment())
_ = Task.Run(async () =>
{
    try
    {
        await Task.Delay(2000); // Wait for app to fully initialize
        using var seedScope = app.Services.CreateScope();
        var db = seedScope.ServiceProvider.GetRequiredService<AppDbContext>();
        var seedLogger = seedScope.ServiceProvider.GetRequiredService<ILogger<Program>>();

        // Create Super Admin user if it doesn't exist
        var superAdminExists = await db.Users.AnyAsync(u => u.Email == "admin@dfile.local");
        if (!superAdminExists)
        {
            var superAdminPassword = BCrypt.Net.BCrypt.HashPassword("Admin@123");
            var superAdmin = new User
            {
                FirstName = "Super",
                LastName = "Administrator",
                Email = "admin@dfile.local",
                PasswordHash = superAdminPassword,
                Role = "Super Admin",
                Status = "Active",
                CreatedAt = DateTime.UtcNow
            };
            db.Users.Add(superAdmin);
            await db.SaveChangesAsync();
            seedLogger.LogInformation("✓ Created test Super Admin user: admin@dfile.local");
        }

        // Create test Tenant if it doesn't exist
        var tenantExists = await db.Tenants.AnyAsync(t => t.Name == "Test Tenant");
        if (!tenantExists)
        {
            var tenant = Tenant.Create("Test Tenant", SubscriptionPlanType.Pro);
            db.Tenants.Add(tenant);
            await db.SaveChangesAsync();
            seedLogger.LogInformation("✓ Created test Tenant: Test Tenant (ID: {TenantId})", tenant.Id);

            // Create Admin user for test tenant
            var adminPassword = BCrypt.Net.BCrypt.HashPassword("Admin@123");
            var admin = new User
            {
                FirstName = "Tenant",
                LastName = "Administrator",
                Email = "tenantadmin@dfile.local",
                PasswordHash = adminPassword,
                Role = "Admin",
                Status = "Active",
                TenantId = tenant.Id,
                CreatedAt = DateTime.UtcNow
            };
            db.Users.Add(admin);
            await db.SaveChangesAsync();
            seedLogger.LogInformation("✓ Created test Admin user: tenantadmin@dfile.local");
        }
    }
    catch (Exception ex)
    {
        var loggerFactory = app.Services.GetRequiredService<ILoggerFactory>();
        var log = loggerFactory.CreateLogger("Program");
        log.LogWarning(ex, "Warning: Test data seeding encountered an issue (this is non-critical and the app will continue)");
    }
});

// Configure the HTTP request pipeline
app.UseForwardedHeaders();
app.UseExceptionHandler(errApp =>
{
    errApp.Run(async context =>
    {
        context.Response.StatusCode = 500;
        context.Response.ContentType = "application/problem+json";
        await context.Response.WriteAsJsonAsync(new
        {
            type = "https://tools.ietf.org/html/rfc7807",
            title = "An unexpected error occurred.",
            status = 500
        });
    });
});
// Rewrite Next.js RSC payload dot-notation URLs to their directory equivalents.
// The static export generates: /login/__next.!KGF1dGgp/login.txt
// The client router requests: /login/__next.!KGF1dGgp.login.txt
// This middleware translates dot-notation back to directory paths before UseStaticFiles serves them.
app.Use(async (context, next) =>
{
    var path = context.Request.Path.Value ?? "";
    var lastSlash = path.LastIndexOf('/');
    if (lastSlash >= 0)
    {
        var filename = path[(lastSlash + 1)..];
        if (filename.StartsWith("__next.", StringComparison.Ordinal) && filename.EndsWith(".txt", StringComparison.Ordinal))
        {
            // Strip "__next." prefix (7 chars) and ".txt" suffix (4 chars)
            var middle = filename[7..^4];
            var firstDot = middle.IndexOf('.');
            if (firstDot > 0)
            {
                var segment = middle[..firstDot];
                var rest = middle[(firstDot + 1)..].Replace('.', '/');
                var dir = path[..lastSlash];
                var rewritten = $"{dir}/__next.{segment}/{rest}.txt";
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
    await next(context);
});

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

// Serve user-uploaded files from <ContentRoot>/uploads/ under the /uploads/* URL path.
// The uploads/ directory is outside wwwroot so it must be registered explicitly.
// Creates the directory if it does not exist to avoid PhysicalFileProvider throwing on startup.
var uploadsPhysicalPath = Path.Combine(app.Environment.ContentRootPath, "uploads");
Directory.CreateDirectory(uploadsPhysicalPath);
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(uploadsPhysicalPath),
    RequestPath = "/uploads"
});

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

// Diagnostic endpoint — verifies secret injection and DB connectivity after deployment.
// In Development: full detail including exception types and connection lengths.
// In Production: boolean status only — no raw exception messages, no secret metadata.
app.MapGet("/api/diag", async (IServiceProvider sp, IConfiguration cfg, string? rcsi = null, string? kill = null) =>
{
    var isDev = app.Environment.IsDevelopment();
    var results = new System.Text.StringBuilder();

    results.Append($"env:{app.Environment.EnvironmentName};");

    if (isDev)
    {
        results.Append($"jwt_key_len:{cfg["Jwt:Key"]?.Length ?? 0};");
        results.Append($"db_conn_len:{cfg.GetConnectionString("DefaultConnection")?.Length ?? 0};");
        results.Append($"skip_mig:{Environment.GetEnvironmentVariable("DFILE_SKIP_MIGRATIONS") ?? "not-set"};");
    }
    else
    {
        results.Append($"jwt_configured:{(!string.IsNullOrWhiteSpace(cfg["Jwt:Key"])).ToString().ToLowerInvariant()};");
        results.Append($"db_configured:{(!string.IsNullOrWhiteSpace(cfg.GetConnectionString("DefaultConnection"))).ToString().ToLowerInvariant()};");
        results.Append($"email_enc_configured:{(!string.IsNullOrWhiteSpace(cfg["EmailEncryption:Key"])).ToString().ToLowerInvariant()};");
        results.Append($"google_configured:{(!string.IsNullOrWhiteSpace(cfg["Google:ClientId"])).ToString().ToLowerInvariant()};");
        results.Append($"google_base_url_configured:{(!string.IsNullOrWhiteSpace(cfg["Google:BackendBaseUrl"])).ToString().ToLowerInvariant()};");
    }


    try
    {
        using var scope = sp.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        try
        {
            var canConnect = db.Database.CanConnect();
            results.Append($"db_connect:{canConnect.ToString().ToLowerInvariant()};");
        }
        catch (Exception ex)
        {
            results.Append(isDev
                ? $"db_connect_err:{ex.GetType().Name};"
                : "db_connect_err:true;");
        }
        try
        {
            await db.Database.ExecuteSqlRawAsync("SELECT 1");
            results.Append("db_query:ok;");
        }
        catch (Exception ex)
        {
            results.Append(isDev
                ? $"db_query_err:{ex.GetType().Name}:{ex.Message.Replace(';', ',')};"
                : "db_query_err:true;");
        }

        // Report pending migrations — helps diagnose schema mismatch 500s
        try
        {
            var pending = (await db.Database.GetPendingMigrationsAsync()).ToList();
            if (isDev)
            {
                results.Append($"pending_migrations:{pending.Count};");
                if (pending.Count > 0)
                    results.Append($"pending_names:{string.Join(',', pending)};");
            }
            else
            {
                results.Append($"pending_migrations:{pending.Count};");
            }
        }
        catch (Exception ex)
        {
            results.Append(isDev
                ? $"migration_check_err:{ex.GetType().Name}:{ex.Message.Replace(';', ',')};"
                : "migration_check_err:true;");
        }

        // Check RCSI status
        try
        {
            using (var cmd = db.Database.GetDbConnection().CreateCommand())
            {
                cmd.CommandText = "SELECT is_read_committed_snapshot_on FROM sys.databases WHERE name = DB_NAME()";
                if (cmd.Connection.State != System.Data.ConnectionState.Open)
                    await cmd.Connection.OpenAsync();
                var status = Convert.ToBoolean(await cmd.ExecuteScalarAsync());
                results.Append($"rcsi_status:{status.ToString().ToLowerInvariant()};");
            }
        }
        catch (Exception ex)
        {
            results.Append($"rcsi_check_err:{ex.GetType().Name};");
        }

        // Enable RCSI if requested
        if (string.Equals(rcsi, "1", StringComparison.Ordinal) || string.Equals(rcsi, "true", StringComparison.OrdinalIgnoreCase))
        {
            try
            {
                await db.Database.ExecuteSqlRawAsync("ALTER DATABASE CURRENT SET READ_COMMITTED_SNAPSHOT ON WITH ROLLBACK IMMEDIATE");
                results.Append("rcsi_action:enabled_successfully;");
            }
            catch (Exception ex)
            {
                results.Append($"rcsi_action_err:{ex.GetType().Name}:{ex.Message.Replace(';', ',')};");
            }
        }

        // Kill active process if requested
        if (int.TryParse(kill, out var sidToKill) && sidToKill > 0)
        {
            try
            {
                var killSql = $"KILL {sidToKill}";
                await db.Database.ExecuteSqlRawAsync(killSql);
                results.Append($"kill_action:killed_{sidToKill};");
            }
            catch (Exception ex)
            {
                results.Append($"kill_err:{ex.GetType().Name}:{ex.Message.Replace(';', ',')};");
            }
        }

        // Query active locks
        try
        {
            var locks = new List<string>();
            using (var cmd = db.Database.GetDbConnection().CreateCommand())
            {
                cmd.CommandText = @"
                    SELECT 
                        request_session_id,
                        resource_type,
                        request_mode,
                        request_status
                    FROM sys.dm_tran_locks 
                    WHERE resource_database_id = DB_ID()";
                if (cmd.Connection.State != System.Data.ConnectionState.Open)
                    await cmd.Connection.OpenAsync();
                using (var reader = await cmd.ExecuteReaderAsync())
                {
                    while (await reader.ReadAsync())
                    {
                        var sid = reader.GetInt32(0);
                        var type = reader.GetString(1);
                        var mode = reader.GetString(2);
                        var status = reader.GetString(3);
                        locks.Add($"{sid}:{type}:{mode}:{status}");
                    }
                }
            }
            if (locks.Count > 0)
            {
                results.Append($"db_locks:{string.Join(',', locks.Take(10))};");
            }
            else
            {
                results.Append("db_locks:none;");
            }
        }
        catch (Exception ex)
        {
            results.Append($"locks_err:{ex.GetType().Name};");
        }

        // Query active blocks
        try
        {
            var blocks = new List<string>();
            using (var cmd = db.Database.GetDbConnection().CreateCommand())
            {
                cmd.CommandText = @"
                    SELECT 
                        session_id,
                        blocking_session_id,
                        wait_type,
                        wait_time
                    FROM sys.dm_exec_requests 
                    WHERE blocking_session_id <> 0";
                if (cmd.Connection.State != System.Data.ConnectionState.Open)
                    await cmd.Connection.OpenAsync();
                using (var reader = await cmd.ExecuteReaderAsync())
                {
                    while (await reader.ReadAsync())
                    {
                        var sid = reader.GetInt16(0);
                        var bid = reader.GetInt16(1);
                        var wt = reader.GetString(2);
                        var wtime = reader.GetInt32(3);
                        blocks.Add($"{sid}<-{bid}({wt}:{wtime}ms)");
                    }
                }
            }
            if (blocks.Count > 0)
            {
                results.Append($"db_blocks:{string.Join(',', blocks)};");
            }
            else
            {
                results.Append("db_blocks:none;");
            }
        }
        catch (Exception ex)
        {
            results.Append($"blocks_err:{ex.GetType().Name};");
        }

        // Probe the exact Tenants AnyAsync query used by the registration availability endpoint.
        // Exposes the exception type and SQL error number to help diagnose the registration 500.
        try
        {
            var tenantsOk = await db.Tenants.AnyAsync(t => t.Name == "diag-probe-does-not-exist");
            results.Append($"tenants_query:ok(result={tenantsOk});");
        }
        catch (Exception ex)
        {
            // In production we expose type + inner SQL error number only — no raw SQL or user data.
            var sqlEx = ex.InnerException as Microsoft.Data.SqlClient.SqlException
                        ?? ex as Microsoft.Data.SqlClient.SqlException;
            var sqlNum = sqlEx?.Number.ToString() ?? "n/a";
            results.Append($"tenants_query_err:{ex.GetType().Name}(sql={sqlNum});");
            // Expose the inner message in production — it is a SQL schema error, not a secret.
            var msg = (ex.InnerException?.Message ?? ex.Message)
                      .Replace(';', ',').Replace('\n', ' ').Replace('\r', ' ');
            if (msg.Length > 300) msg = msg[..300];
            results.Append($"tenants_query_detail:{msg};");
        }
    }
    catch (Exception ex)
    {
        results.Append(isDev
            ? $"scope_err:{ex.GetType().Name};"
            : "scope_err:true;");
    }

    // Check logs directory for stdout logs to diagnose 500 errors
    try
    {
        var logsPath = Path.Combine(Directory.GetCurrentDirectory(), "logs");
        if (Directory.Exists(logsPath))
        {
            var files = Directory.GetFiles(logsPath);
            results.Append($"logs_dir_exists:true;logs_files_count:{files.Length};");
            var latestFile = files.Select(f => new FileInfo(f)).OrderByDescending(fi => fi.LastWriteTime).FirstOrDefault();
            if (latestFile != null)
            {
                results.Append($"latest_log_file:{latestFile.Name};latest_log_size:{latestFile.Length};");
                using var fs = new FileStream(latestFile.FullName, FileMode.Open, FileAccess.Read, FileShare.ReadWrite);
                using var reader = new StreamReader(fs);
                var content = await reader.ReadToEndAsync();
                var lastPart = content.Length > 2000 ? content[^2000..] : content;
                results.Append($"latest_log_tail:{lastPart.Replace(';', ',').Replace('\n', ' ').Replace('\r', ' ')};");
            }
        }
        else
        {
            results.Append("logs_dir_exists:false;");
        }
    }
    catch (Exception ex)
    {
        results.Append($"logs_check_err:{ex.GetType().Name}:{ex.Message.Replace(';', ',')};");
    }

    return Results.Ok(results.ToString());
});

// DB test endpoint — Super Admin only, error message sanitized
if (app.Environment.IsDevelopment())
{
    app.MapGet("/api/db-test", (AppDbContext db) =>
    {
        try
        {
            return db.Database.CanConnect()
                ? Results.Ok("Database connection successful.")
                : Results.Problem("Database connection failed.");
        }
        catch
        {
            return Results.Problem("Database connection error.");
        }
    }).RequireAuthorization(policy => policy.RequireRole("Super Admin"));
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