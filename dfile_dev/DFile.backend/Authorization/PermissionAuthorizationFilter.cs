using DFile.backend.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using System.Security.Claims;

namespace DFile.backend.Authorization
{
    /// <summary>
    /// Global authorization filter that enforces module-level permissions via RequirePermissionAttribute.
    /// Runs before model binding so permission checks happen before validation.
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
            // Find RequirePermission attributes on action first, then controller
            var attributes = context.ActionDescriptor.EndpointMetadata
                .OfType<RequirePermissionAttribute>()
                .ToList();

            // No permission attribute = no restriction (falls through to standard [Authorize])
            if (attributes.Count == 0)
            {
                return;
            }

            var user = context.HttpContext.User;

            // Must be authenticated
            if (user.Identity == null || !user.Identity.IsAuthenticated)
            {
                context.Result = new UnauthorizedResult();
                return;
            }

            // Super Admin bypasses all permission checks
            if (user.IsInRole("Super Admin"))
            {
                return;
            }

            // Extract user ID and tenant ID from claims
            var userIdStr = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var tenantIdStr = user.FindFirst("TenantId")?.Value;

            if (string.IsNullOrEmpty(userIdStr) || !int.TryParse(userIdStr, out int userId) ||
                string.IsNullOrEmpty(tenantIdStr) || !int.TryParse(tenantIdStr, out int tenantId))
            {
                context.Result = new ForbidResult();
                return;
            }

            // Check ALL required permissions (all must pass)
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
