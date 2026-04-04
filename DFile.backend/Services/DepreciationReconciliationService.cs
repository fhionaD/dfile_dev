using DFile.backend.Data;
using DFile.backend.Models;
using Microsoft.EntityFrameworkCore;

namespace DFile.backend.Services
{
    /// <summary>
    /// Periodically applies straight-line monthly depreciation to book value until caught up to the current month.
    /// </summary>
    public class DepreciationReconciliationService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly IConfiguration _configuration;
        private readonly ILogger<DepreciationReconciliationService> _logger;

        public DepreciationReconciliationService(
            IServiceProvider serviceProvider,
            IConfiguration configuration,
            ILogger<DepreciationReconciliationService> logger)
        {
            _serviceProvider = serviceProvider;
            _configuration = configuration;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            var hours = Math.Clamp(_configuration.GetValue("Depreciation:ReconciliationIntervalHours", 24), 1, 168);
            _logger.LogInformation("Depreciation reconciliation will run every {Hours} hour(s).", hours);

            try
            {
                using var scope0 = _serviceProvider.CreateScope();
                var db0 = scope0.ServiceProvider.GetRequiredService<AppDbContext>();
                await ReconcileAsync(db0, stoppingToken);
            }
            catch (Exception ex) when (!stoppingToken.IsCancellationRequested)
            {
                _logger.LogWarning(ex, "Initial depreciation reconciliation skipped or failed.");
            }

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    using var scope = _serviceProvider.CreateScope();
                    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                    await ReconcileAsync(db, stoppingToken);
                }
                catch (Exception ex) when (!stoppingToken.IsCancellationRequested)
                {
                    _logger.LogError(ex, "Depreciation reconciliation run failed.");
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

        internal static async Task ReconcileAsync(AppDbContext db, CancellationToken cancellationToken)
        {
            var now = DateTime.UtcNow;
            var assets = await db.Assets
                .Where(a => !a.IsArchived
                    && a.LifecycleStatus != LifecycleStatus.Disposed
                    && a.MonthlyDepreciation > 0
                    && a.UsefulLifeYears > 0)
                .ToListAsync(cancellationToken);

            foreach (var asset in assets)
            {
                var lifeMonths = asset.UsefulLifeYears * 12;
                var created = asset.CreatedAt;
                var monthsSinceCreation =
                    (now.Year - created.Year) * 12 + now.Month - created.Month;
                if (monthsSinceCreation < 0)
                    continue;

                var targetApplied = Math.Min(monthsSinceCreation, lifeMonths);
                var delta = targetApplied - asset.DepreciationMonthsApplied;
                if (delta <= 0)
                    continue;

                // Use SalvageValue if available, otherwise fall back to ResidualValue, then 0
                var floor = asset.SalvageValue ?? asset.ResidualValue ?? 0m;
                for (var i = 0; i < delta; i++)
                {
                    if (asset.CurrentBookValue <= floor)
                        break;
                    asset.CurrentBookValue = Math.Max(floor, asset.CurrentBookValue - asset.MonthlyDepreciation);
                    asset.DepreciationMonthsApplied++;
                }

                asset.UpdatedAt = now;
            }

            await db.SaveChangesAsync(cancellationToken);
        }
    }
}
