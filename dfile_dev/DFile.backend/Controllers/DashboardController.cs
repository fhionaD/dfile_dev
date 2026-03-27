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

            var totalActive = await activeAssets.CountAsync();
            var unallocated = await activeAssets.Where(a => a.LifecycleStatus == LifecycleStatus.Registered).CountAsync();
            var underMaintenance = await activeAssets.Where(a => a.LifecycleStatus == LifecycleStatus.UnderMaintenance).CountAsync();
            var forReplacement = await activeAssets.Where(a => a.LifecycleStatus == LifecycleStatus.ForReplacement).CountAsync();
            var totalBookValue = await activeAssets.SumAsync(a => a.CurrentBookValue);

            var pendingApprovals = await poQuery.Where(p => !p.IsArchived && p.Status == "Pending").CountAsync();

            var thisMonth = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1);
            var disposedThisMonth = await assetsQuery.Where(a => a.LifecycleStatus == LifecycleStatus.Disposed && a.UpdatedAt >= thisMonth).CountAsync();

            var overdueCount = await maintenanceQuery.Where(m =>
                !m.IsArchived &&
                m.Status != "Completed" &&
                m.EndDate.HasValue &&
                m.EndDate < DateTime.UtcNow).CountAsync();

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
