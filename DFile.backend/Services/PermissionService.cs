using DFile.backend.Data;
using DFile.backend.DTOs;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace DFile.backend.Services
{
    public class PermissionService
    {
        private readonly AppDbContext _context;
        private readonly IMemoryCache _cache;
        private static readonly TimeSpan CacheDuration = TimeSpan.FromMinutes(5);

        public PermissionService(AppDbContext context, IMemoryCache cache)
        {
            _context = context;
            _cache = cache;
        }

        /// <summary>
        /// Resolves the effective permissions for a user within a tenant.
        /// Chain: User → UserRoleAssignment → TenantRole → RoleTemplate → RolePermissions
        /// If user has multiple role assignments, permissions are merged with OR logic.
        /// Results are cached for 5 minutes per user+tenant pair.
        /// </summary>
        public async Task<List<ModulePermissionDto>> GetUserPermissions(int userId, int tenantId)
        {
            var cacheKey = $"perms:{userId}:{tenantId}";

            if (_cache.TryGetValue(cacheKey, out List<ModulePermissionDto>? cached) && cached != null)
                return cached;

            // Two round-trips: avoids correlated subqueries / APPLY patterns EF can generate from
            // SelectMany(RolePermissions) on the join chain, which was disproportionately slow on login.
            var templateIds = await _context.UserRoleAssignments
                .AsNoTracking()
                .Where(ura => ura.UserId == userId)
                .Join(
                    _context.TenantRoles.Where(tr => tr.TenantId == tenantId),
                    ura => ura.TenantRoleId,
                    tr => tr.Id,
                    (ura, tr) => tr.RoleTemplateId)
                .Join(
                    _context.RoleTemplates.Where(rt => !rt.IsArchived),
                    rtId => rtId,
                    rt => rt.Id,
                    (rtId, rt) => rt.Id)
                .Distinct()
                .ToListAsync();

            if (templateIds.Count == 0)
            {
                var empty = new List<ModulePermissionDto>();
                _cache.Set(cacheKey, empty, CacheDuration);
                return empty;
            }

            var rows = await _context.RolePermissions
                .AsNoTracking()
                .Where(rp => templateIds.Contains(rp.RoleTemplateId))
                .ToListAsync();

            var permissions = rows
                .GroupBy(rp => rp.ModuleName)
                .Select(g => new ModulePermissionDto
                {
                    ModuleName = g.Key,
                    CanView = g.Any(p => p.CanView),
                    CanCreate = g.Any(p => p.CanCreate),
                    CanEdit = g.Any(p => p.CanEdit),
                    CanApprove = g.Any(p => p.CanApprove),
                    CanArchive = g.Any(p => p.CanArchive),
                })
                .ToList();

            _cache.Set(cacheKey, permissions, CacheDuration);
            return permissions;
        }

        /// <summary>
        /// Checks if a user has a specific permission on a module.
        /// Super Admin check should be done by the caller before calling this.
        /// Uses the cached permission list to avoid redundant DB queries.
        /// </summary>
        public async Task<bool> HasPermission(int userId, int tenantId, string moduleName, string action)
        {
            var permissions = await GetUserPermissions(userId, tenantId);
            var modulePerms = permissions.FirstOrDefault(p => p.ModuleName == moduleName);
            if (modulePerms == null) return false;

            return action switch
            {
                "CanView" => modulePerms.CanView,
                "CanCreate" => modulePerms.CanCreate,
                "CanEdit" => modulePerms.CanEdit,
                "CanApprove" => modulePerms.CanApprove,
                "CanArchive" => modulePerms.CanArchive,
                _ => false
            };
        }

        /// <summary>
        /// Invalidates cached permissions for a specific user+tenant pair.
        /// Call this when role assignments change.
        /// </summary>
        public void InvalidateCache(int userId, int tenantId)
        {
            _cache.Remove($"perms:{userId}:{tenantId}");
        }
    }
}

