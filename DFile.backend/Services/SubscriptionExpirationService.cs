using DFile.backend.Data;
using DFile.backend.Models;
using Microsoft.EntityFrameworkCore;

namespace DFile.backend.Services
{
    /// <summary>
    /// Daily background job that detects expiring and expired subscriptions.
    /// Sends in-app notifications and emails to tenant administrators at the
    /// 7-day, 3-day, and 1-day thresholds, then marks subscriptions as Expired.
    /// </summary>
    public class SubscriptionExpirationService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly IConfiguration _configuration;
        private readonly ILogger<SubscriptionExpirationService> _logger;

        public SubscriptionExpirationService(
            IServiceProvider serviceProvider,
            IConfiguration configuration,
            ILogger<SubscriptionExpirationService> logger)
        {
            _serviceProvider = serviceProvider;
            _configuration = configuration;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            var hours = Math.Clamp(
                _configuration.GetValue("Subscription:ExpirationCheckIntervalHours", 24), 1, 168);
            _logger.LogInformation("Subscription expiration check will run every {Hours} hour(s).", hours);

            var startupDelayMinutes = Math.Clamp(
                _configuration.GetValue("Subscription:StartupDelayMinutes", 5), 0, 60);
            if (startupDelayMinutes > 0)
            {
                try { await Task.Delay(TimeSpan.FromMinutes(startupDelayMinutes), stoppingToken); }
                catch (TaskCanceledException) { return; }
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
                    _logger.LogError(ex, "Subscription expiration check run failed.");
                }

                try { await Task.Delay(TimeSpan.FromHours(hours), stoppingToken); }
                catch (TaskCanceledException) { return; }
            }
        }

        private async Task RunOnceAsync(AppDbContext db, INotificationService notifications, CancellationToken ct)
        {
            var todayUtc = DateTime.UtcNow.Date;

            // Only process paid, non-expired subscriptions
            var subscriptions = await db.TenantSubscriptions
                .Include(s => s.Plan)
                .Where(s => !s.IsFreePlan
                    && (s.Status == SubscriptionStatus.Active || s.Status == SubscriptionStatus.Expiring))
                .ToListAsync(ct);

            foreach (var sub in subscriptions)
            {
                var daysLeft = (int)(sub.EndDate.Date - todayUtc).TotalDays;

                if (daysLeft <= 0)
                {
                    sub.Status = SubscriptionStatus.Expired;
                    sub.UpdatedAt = DateTime.UtcNow;
                    await notifications.NotifySubscriptionExpiredAsync(sub.TenantId, sub.Plan.Name, ct);
                    _logger.LogInformation(
                        "Subscription {Id} (Tenant {TenantId}, Plan {Plan}) marked Expired.",
                        sub.Id, sub.TenantId, sub.Plan.Name);
                    continue;
                }

                // Transition to Expiring state at 7 days
                if (daysLeft <= 7 && sub.Status == SubscriptionStatus.Active)
                {
                    sub.Status = SubscriptionStatus.Expiring;
                    sub.UpdatedAt = DateTime.UtcNow;
                }

                // 7-day reminder (sent once)
                if (daysLeft <= 7 && sub.NotifiedAt7Days == null)
                {
                    sub.NotifiedAt7Days = DateTime.UtcNow;
                    sub.UpdatedAt = DateTime.UtcNow;
                    await notifications.NotifySubscriptionExpiringAsync(
                        sub.TenantId, sub.Plan.Name, sub.EndDate, daysLeft, ct);
                    _logger.LogInformation(
                        "Subscription {Id}: 7-day expiry notice sent (daysLeft={Days}).", sub.Id, daysLeft);
                }

                // 3-day reminder (sent once)
                if (daysLeft <= 3 && sub.NotifiedAt3Days == null)
                {
                    sub.NotifiedAt3Days = DateTime.UtcNow;
                    sub.UpdatedAt = DateTime.UtcNow;
                    await notifications.NotifySubscriptionExpiringAsync(
                        sub.TenantId, sub.Plan.Name, sub.EndDate, daysLeft, ct);
                    _logger.LogInformation(
                        "Subscription {Id}: 3-day expiry notice sent (daysLeft={Days}).", sub.Id, daysLeft);
                }

                // 1-day reminder (sent once)
                if (daysLeft == 1 && sub.NotifiedAt1Day == null)
                {
                    sub.NotifiedAt1Day = DateTime.UtcNow;
                    sub.UpdatedAt = DateTime.UtcNow;
                    await notifications.NotifySubscriptionExpiringAsync(
                        sub.TenantId, sub.Plan.Name, sub.EndDate, daysLeft, ct);
                    _logger.LogInformation(
                        "Subscription {Id}: 1-day expiry notice sent.", sub.Id);
                }
            }

            await db.SaveChangesAsync(ct);
        }
    }
}
