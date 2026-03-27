using DFile.backend.Data;
using DFile.backend.DTOs;
using DFile.backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DFile.backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class DashboardController : TenantAwareController
    {
        private readonly AppDbContext _context;

        public DashboardController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet("summary")]
        public async Task<ActionResult<DashboardSummaryDto>> GetSummary()
        {
            var tenantId = GetCurrentTenantId();

            var assetsQuery = _context.Assets.AsQueryable();
            var maintenanceQuery = _context.MaintenanceRecords.AsQueryable();
            var poQuery = _context.PurchaseOrders.AsQueryable();

            if (!IsSuperAdmin() && tenantId.HasValue)
            {
                assetsQuery = assetsQuery.Where(a => a.TenantId == tenantId);
                maintenanceQuery = maintenanceQuery.Where(m => m.TenantId == tenantId);
                poQuery = poQuery.Where(p => p.TenantId == tenantId);
            }

            // Active (non-archived, non-disposed) assets
            var activeAssets = assetsQuery.Where(a => !a.IsArchived && a.LifecycleStatus != LifecycleStatus.Disposed);

            // Single query: group by lifecycle status to get all counts + sums at once
            var assetMetrics = await activeAssets
                .GroupBy(a => a.LifecycleStatus)
                .Select(g => new
                {
                    Status = g.Key,
                    Count = g.Count(),
                    BookValue = g.Sum(a => a.CurrentBookValue)
                })
                .ToListAsync();

            var totalActive = assetMetrics.Sum(m => m.Count);
            var unallocated = assetMetrics.Where(m => m.Status == LifecycleStatus.Registered).Sum(m => m.Count);
            var underMaintenance = assetMetrics.Where(m => m.Status == LifecycleStatus.UnderMaintenance).Sum(m => m.Count);
            var forReplacement = assetMetrics.Where(m => m.Status == LifecycleStatus.ForReplacement).Sum(m => m.Count);
            var totalBookValue = assetMetrics.Sum(m => m.BookValue);

            var pendingApprovals = await poQuery.CountAsync(p => !p.IsArchived && p.Status == "Pending");

            var thisMonth = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1);
            var disposedThisMonth = await assetsQuery.CountAsync(a => a.LifecycleStatus == LifecycleStatus.Disposed && a.UpdatedAt >= thisMonth);

            var overdueCount = await maintenanceQuery.CountAsync(m =>
                !m.IsArchived &&
                m.Status != "Completed" &&
                m.EndDate.HasValue &&
                m.EndDate < DateTime.UtcNow);

            return Ok(new DashboardSummaryDto
            {
                TotalActiveAssets = totalActive,
                UnallocatedAssets = unallocated,
                AssetsUnderMaintenance = underMaintenance,
                ReplacementCandidates = forReplacement,
                PendingProcurementApprovals = pendingApprovals,
                DisposedThisMonth = disposedThisMonth,
                TotalCurrentBookValue = totalBookValue,
                OverdueMaintenanceItems = overdueCount
            });
        }
    }
}
