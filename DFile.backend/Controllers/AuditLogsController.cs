using DFile.backend.Data;
using DFile.backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DFile.backend.Controllers
{
    /// <summary>Row type for EF Core raw SQL aggregate over AuditLogs (summary endpoint).</summary>
    internal sealed class AuditSummaryStatsRow
    {
        public long TotalLogs { get; set; }
        public long TodayLogs { get; set; }
        public long WeekLogs { get; set; }
    }

    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class AuditLogsController : TenantAwareController
    {
        private readonly AppDbContext _context;

        public AuditLogsController(AppDbContext context)
        {
            _context = context;
        }

        /// <summary>Tenant-scoped for Admin; platform-wide for Super Admin. Maintenance/Finance cannot access.</summary>
        [HttpGet]
        public async Task<ActionResult<object>> GetAuditLogs(
            [FromQuery] string? entityType = null,
            [FromQuery] string? action = null,
            [FromQuery] string? module = null,
            [FromQuery] string? userRole = null,
            [FromQuery] int? userId = null,
            [FromQuery] DateTime? dateFrom = null,
            [FromQuery] DateTime? dateTo = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 25)
        {
            if (!IsSuperAdmin() && !User.IsInRole("Admin"))
                return Forbid();

            var tenantId = GetCurrentTenantId();
            var query = _context.AuditLogs.AsNoTracking().AsQueryable();

            if (!IsSuperAdmin() && tenantId.HasValue)
            {
                query = query.Where(a => a.TenantId == tenantId);
            }

            if (!string.IsNullOrEmpty(entityType))
                query = query.Where(a => a.EntityType == entityType);

            if (!string.IsNullOrEmpty(action))
                query = query.Where(a => a.Action == action);

            if (!string.IsNullOrEmpty(module))
                query = query.Where(a => a.Module == module);

            if (!string.IsNullOrEmpty(userRole))
                query = query.Where(a => a.UserRole == userRole);

            if (userId.HasValue)
                query = query.Where(a => a.UserId == userId.Value);

            if (dateFrom.HasValue)
            {
                var from = dateFrom.Value.Kind == DateTimeKind.Unspecified
                    ? DateTime.SpecifyKind(dateFrom.Value, DateTimeKind.Utc)
                    : dateFrom.Value.ToUniversalTime();
                query = query.Where(a => a.CreatedAt >= from);
            }

            if (dateTo.HasValue)
            {
                var to = dateTo.Value.Kind == DateTimeKind.Unspecified
                    ? DateTime.SpecifyKind(dateTo.Value, DateTimeKind.Utc)
                    : dateTo.Value.ToUniversalTime();
                if (to.TimeOfDay == TimeSpan.Zero)
                    to = to.Date.AddDays(1).AddTicks(-1);
                query = query.Where(a => a.CreatedAt <= to);
            }

            var totalCount = await query.CountAsync();
            if (page < 1) page = 1;
            if (pageSize < 1) pageSize = 25;
            if (pageSize > 200) pageSize = 200;
            var totalPages = totalCount == 0 ? 0 : (int)Math.Ceiling(totalCount / (double)pageSize);
            if (totalCount == 0) page = 1;
            else if (page > totalPages) page = totalPages;

            var logs = await query
                .OrderByDescending(a => a.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(a => new
                {
                    a.Id,
                    a.Action,
                    a.EntityType,
                    a.EntityId,
                    a.Module,
                    a.Description,
                    a.UserRole,
                    a.UserId,
                    UserName = a.User != null ? a.User.FirstName + " " + a.User.LastName : null,
                    a.TenantId,
                    a.IpAddress,
                    a.CreatedAt
                })
                .ToListAsync();

            return Ok(new { totalCount, totalPages, page, pageSize, data = logs });
        }

        [HttpGet("summary")]
        [Authorize(Roles = "Super Admin")]
        public async Task<ActionResult> GetAuditSummary()
        {
            var today = DateTime.UtcNow.Date;
            var weekAgo = today.AddDays(-7);

            // Single table scan for totals (replaces three separate COUNT queries).
            var stats = await _context.Database
                .SqlQuery<AuditSummaryStatsRow>($@"
                    SELECT CAST(COUNT(*) AS bigint) AS TotalLogs,
                           CAST(COALESCE(SUM(CASE WHEN [CreatedAt] >= {today} THEN 1 ELSE 0 END), 0) AS bigint) AS TodayLogs,
                           CAST(COALESCE(SUM(CASE WHEN [CreatedAt] >= {weekAgo} THEN 1 ELSE 0 END), 0) AS bigint) AS WeekLogs
                    FROM [AuditLogs]")
                .SingleAsync();

            // Same DbContext must not run two EF queries concurrently; keep these sequential.
            var byAction = await _context.AuditLogs.AsNoTracking()
                .GroupBy(a => a.Action)
                .Select(g => new { Action = g.Key, Count = g.Count() })
                .ToListAsync();

            var byEntity = await _context.AuditLogs.AsNoTracking()
                .GroupBy(a => a.EntityType)
                .Select(g => new { EntityType = g.Key, Count = g.Count() })
                .ToListAsync();

            return Ok(new
            {
                totalLogs = stats.TotalLogs,
                todayLogs = stats.TodayLogs,
                weekLogs = stats.WeekLogs,
                byAction,
                byEntity
            });
        }
    }
}
