using DFile.backend.Data;
using DFile.backend.DTOs;
using Microsoft.EntityFrameworkCore;

namespace DFile.backend.Services
{
    public class PermissionService
    {
        private readonly AppDbContext _context;

        public PermissionService(AppDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// Resolves the effective permissions for a user within a tenant.
        /// Chain: User → UserRoleAssignment → TenantRole → RoleTemplate → RolePermissions
        /// If user has multiple role assignments, permissions are merged with OR logic.
        /// </summary>
        public async Task<List<ModulePermissionDto>> GetUserPermissions(int userId, int tenantId)
        {
            var permissions = await _context.UserRoleAssignments
                .Where(ura => ura.UserId == userId)
                .Join(
                    _context.TenantRoles.Where(tr => tr.TenantId == tenantId),
                    ura => ura.TenantRoleId,
                    tr => tr.Id,
                    (ura, tr) => tr.RoleTemplateId
                )
                .Join(
                    _context.RoleTemplates.Where(rt => !rt.IsArchived),
                    rtId => rtId,
                    rt => rt.Id,
                    (rtId, rt) => rt.Id
                )
                .SelectMany(rtId => _context.RolePermissions
                    .Where(rp => rp.RoleTemplateId == rtId))
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
                .ToListAsync();

            return permissions;
        }

        /// <summary>
        /// Checks if a user has a specific permission on a module.
        /// Super Admin check should be done by the caller before calling this.
        /// </summary>
        public async Task<bool> HasPermission(int userId, int tenantId, string moduleName, string action)
        {
            // Merge permissions across all role templates (OR), same as GetUserPermissions.
            // FirstOrDefault on joined RolePermissions could pick the wrong row when a user has multiple roles.
            var permissions = await _context.UserRoleAssignments
                .Where(ura => ura.UserId == userId)
                .Join(
                    _context.TenantRoles.Where(tr => tr.TenantId == tenantId),
                    ura => ura.TenantRoleId,
                    tr => tr.Id,
                    (ura, tr) => tr.RoleTemplateId
                )
                .Join(
                    _context.RoleTemplates.Where(rt => !rt.IsArchived),
                    rtId => rtId,
                    rt => rt.Id,
                    (rtId, rt) => rt.Id
                )
                .SelectMany(rtId => _context.RolePermissions
                    .Where(rp => rp.RoleTemplateId == rtId && rp.ModuleName == moduleName))
                .ToListAsync();

            if (permissions.Count == 0) return false;

            return action switch
            {
                "CanView" => permissions.Any(p => p.CanView),
                "CanCreate" => permissions.Any(p => p.CanCreate),
                "CanEdit" => permissions.Any(p => p.CanEdit),
                "CanApprove" => permissions.Any(p => p.CanApprove),
                "CanArchive" => permissions.Any(p => p.CanArchive),
                _ => false
            };
        }
    }
}
