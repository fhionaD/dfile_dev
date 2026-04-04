using DFile.backend.Data;
using DFile.backend.DTOs;
using Microsoft.EntityFrameworkCore;

namespace DFile.backend.Services
{
    /// <summary>
    /// Daily check for recurring maintenance whose next due date is today (UTC); creates tenant notifications.
    /// </summary>
    public class MaintenanceDueReminderService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly IConfiguration _configuration;
        private readonly ILogger<MaintenanceDueReminderService> _logger;

        public MaintenanceDueReminderService(
            IServiceProvider serviceProvider,
            IConfiguration configuration,
            ILogger<MaintenanceDueReminderService> logger)
        {
            _serviceProvider = serviceProvider;
            _configuration = configuration;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            var hours = Math.Clamp(_configuration.GetValue("Maintenance:DueReminderIntervalHours", 24), 1, 168);
            _logger.LogInformation("Maintenance due reminders will run every {Hours} hour(s).", hours);

            // Defer first scan so cold-start API traffic (logins, dashboards) is not competing with a full-table read.
            var startupDelayMinutes = Math.Clamp(_configuration.GetValue("Maintenance:DueReminderStartupDelayMinutes", 5), 0, 60);
            if (startupDelayMinutes > 0)
            {
                try
                {
                    await Task.Delay(TimeSpan.FromMinutes(startupDelayMinutes), stoppingToken);
                }
                catch (TaskCanceledException)
                {
                    return;
                }
            }

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    using var scope = _serviceProvider.CreateScope();
                    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                    var notifications = scope.ServiceProvider.GetRequiredService<INotificationService>();
                    await RunOnceAsync(db, notifications, stoppingToken);
                }
                catch (Exception ex) when (!stoppingToken.IsCancellationRequested)
                {
                    _logger.LogError(ex, "Maintenance due reminder run failed.");
                }

                try
                {
                    await Task.Delay(TimeSpan.FromHours(hours), stoppingToken);
                }
                catch (TaskCanceledException)
                {
                    break;
                }
            }
        }

        internal static async Task RunOnceAsync(
            AppDbContext db,
            INotificationService notifications,
            CancellationToken cancellationToken)
        {
            var today = DateTime.UtcNow.Date;
            var utcNow = DateTime.UtcNow;
            // Narrow projection only — the old Include(r => r.Asset) pulled every column from both tables
            // (see EF logs) and competed with interactive API traffic.
            var rows = await db.MaintenanceRecords
                .AsNoTracking()
                .Where(r => !r.IsArchived
                    && r.Status.ToLower() != "completed"
                    && r.Frequency != null
                    && r.Frequency.Trim() != string.Empty
                    && r.Frequency.Trim().ToLower() != "one-time")
                .Select(r => new
                {
                    r.Id,
                    r.AssetId,
                    r.Description,
                    r.TenantId,
                    r.Status,
                    r.Frequency,
                    r.StartDate,
                    r.EndDate,
                    r.IsArchived,
                    AssetName = r.Asset != null ? r.Asset.AssetName : null,
                    AssetCode = r.Asset != null ? r.Asset.AssetCode : null,
                    AssetTenantId = r.Asset != null ? r.Asset.TenantId : null,
                })
                .ToListAsync(cancellationToken);

            foreach (var row in rows)
            {
                var next = MaintenanceSchedulingService.ComputeNextDueDate(
                    row.IsArchived,
                    row.Status,
                    row.Frequency,
                    row.StartDate,
                    row.EndDate,
                    utcNow);
                if (!next.HasValue || next.Value.Date != today)
                    continue;

                var tomorrow = today.AddDays(1);
                var already = await db.Notifications.AnyAsync(
                    n => n.EntityType == "MaintenanceRecord"
                         && n.EntityId == row.Id
                         && n.CreatedAt >= today
                         && n.CreatedAt < tomorrow,
                    cancellationToken);
                if (already)
                    continue;

                await notifications.NotifyMaintenanceDueAsync(new MaintenanceDueNoticeDto
                {
                    RecordId = row.Id,
                    Description = row.Description,
                    AssetId = row.AssetId,
                    AssetName = row.AssetName,
                    AssetCode = row.AssetCode,
                    RecordTenantId = row.TenantId,
                    AssetTenantId = row.AssetTenantId,
                }, cancellationToken);
            }

            await db.SaveChangesAsync(cancellationToken);
        }
    }
}
