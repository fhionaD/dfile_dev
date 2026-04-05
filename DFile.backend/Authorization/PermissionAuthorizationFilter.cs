using DFile.backend.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using System.Linq;
using System.Security.Claims;

namespace DFile.backend.Authorization
{
    /// <summary>
    /// Global authorization filter for <see cref="RequirePermissionAttribute"/> and
    /// <see cref="RequirePermissionOrRolesAttribute"/>. Runs before model binding.
    /// Super Admin bypasses all permission checks.
    /// </summary>
    public class PermissionAuthorizationFilter : IAsyncAuthorizationFilter
    {
        private readonly PermissionService _permissionService;

        public PermissionAuthorizationFilter(PermissionService permissionService)
        {
            _permissionService = permissionService;
        }

        public async Task OnAuthorizationAsync(AuthorizationFilterContext context)
        {
            var attributes = context.ActionDescriptor.EndpointMetadata
                .OfType<RequirePermissionAttribute>()
                .ToList();
            var orRoleAttributes = context.ActionDescriptor.EndpointMetadata
                .OfType<RequirePermissionOrRolesAttribute>()
                .ToList();

            if (attributes.Count == 0 && orRoleAttributes.Count == 0)
            {
                return;
            }

            var user = context.HttpContext.User;

            if (user.Identity == null || !user.Identity.IsAuthenticated)
            {
                context.Result = new UnauthorizedResult();
                return;
            }

            if (user.IsInRole("Super Admin"))
            {
                return;
            }

            var userIdStr = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var tenantIdStr = user.FindFirst("TenantId")?.Value;

            if (string.IsNullOrEmpty(userIdStr) || !int.TryParse(userIdStr, out int userId) ||
                string.IsNullOrEmpty(tenantIdStr) || !int.TryParse(tenantIdStr, out int tenantId))
            {
                context.Result = new ForbidResult();
                return;
            }

            foreach (var attr in orRoleAttributes)
            {
                var hasPerm = await _permissionService.HasPermission(userId, tenantId, attr.ModuleName, attr.Action);
                var hasRole = attr.AlternateRoles.Length > 0 && attr.AlternateRoles.Any(user.IsInRole);
                if (!hasPerm && !hasRole)
                {
                    context.Result = new ObjectResult(new { message = $"You do not have permission to {attr.Action.Replace("Can", "").ToLower()} {attr.ModuleName}." })
                    {
                        StatusCode = 403
                    };
                    return;
                }
            }

            foreach (var attr in attributes)
            {
                var allowed = await _permissionService.HasPermission(userId, tenantId, attr.ModuleName, attr.Action);
                if (!allowed)
                {
                    context.Result = new ObjectResult(new { message = $"You do not have permission to {attr.Action.Replace("Can", "").ToLower()} {attr.ModuleName}." })
                    {
                        StatusCode = 403
                    };
                    return;
                }
            }
        }
    }
}
