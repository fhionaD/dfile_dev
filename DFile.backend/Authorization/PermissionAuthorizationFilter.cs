using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using System.Linq;
using System.Security.Claims;

namespace DFile.backend.Authorization
{
    /// <summary>
    /// Global authorization filter for <see cref="RequirePermissionAttribute"/> and
    /// <see cref="RequirePermissionOrRolesAttribute"/>. Evaluates role-based module permissions.
    /// Super Admin bypasses all checks. Other roles are validated against a static permission table.
    /// </summary>
    public class PermissionAuthorizationFilter : IAsyncAuthorizationFilter
    {
        // Key: "role|module|action" — pipe-delimited, OrdinalIgnoreCase for O(1) lookup.
        private static readonly HashSet<string> _permissions = new(StringComparer.OrdinalIgnoreCase)
        {
            // Admin: full access to all modules
            "Admin|Assets|CanView",    "Admin|Assets|CanCreate",  "Admin|Assets|CanEdit",
            "Admin|Assets|CanApprove", "Admin|Assets|CanArchive",
            "Admin|Allocation|CanView",    "Admin|Allocation|CanCreate",
            "Admin|Allocation|CanEdit",    "Admin|Allocation|CanArchive",
            "Admin|Maintenance|CanView",   "Admin|Maintenance|CanCreate",
            "Admin|Maintenance|CanEdit",   "Admin|Maintenance|CanArchive",
            "Admin|PurchaseOrders|CanView",   "Admin|PurchaseOrders|CanCreate",
            "Admin|PurchaseOrders|CanEdit",   "Admin|PurchaseOrders|CanApprove",
            "Admin|PurchaseOrders|CanArchive",
            "Admin|Rooms|CanView",   "Admin|Rooms|CanCreate",
            "Admin|Rooms|CanEdit",   "Admin|Rooms|CanArchive",
            "Admin|AssetCategories|CanView",   "Admin|AssetCategories|CanCreate",
            "Admin|AssetCategories|CanEdit",   "Admin|AssetCategories|CanArchive",
            "Admin|RoomCategories|CanView",    "Admin|RoomCategories|CanCreate",
            "Admin|RoomCategories|CanEdit",    "Admin|RoomCategories|CanArchive",
            "Admin|Tasks|CanView",   "Admin|Tasks|CanCreate",
            "Admin|Tasks|CanEdit",   "Admin|Tasks|CanArchive",
            "Admin|Users|CanView",   "Admin|Users|CanCreate", "Admin|Users|CanEdit",
            "Admin|AuditLogs|CanView",

            // Finance: view + manage asset financial data; view maintenance costs
            "Finance|Assets|CanView",  "Finance|Assets|CanCreate", "Finance|Assets|CanEdit",
            "Finance|AssetCategories|CanView",
            "Finance|RoomCategories|CanView",
            "Finance|Maintenance|CanView",
            "Finance|MaintenanceRequests|CanView", "Finance|MaintenanceRequests|CanEdit",
            "Finance|Rooms|CanView",
            "Finance|PurchaseOrders|CanView",
            "Finance|Tasks|CanView",

            // Maintenance: create and manage maintenance records; view assets
            "Maintenance|Maintenance|CanView",  "Maintenance|Maintenance|CanCreate",
            "Maintenance|Maintenance|CanEdit",
            "Maintenance|Assets|CanView",
            "Maintenance|AssetCategories|CanView",
            "Maintenance|RoomCategories|CanView",
            "Maintenance|Rooms|CanView",
            "Maintenance|PurchaseOrders|CanView",
            "Maintenance|Tasks|CanView",

            // Procurement: full purchase order lifecycle; view assets
            "Procurement|PurchaseOrders|CanView",   "Procurement|PurchaseOrders|CanCreate",
            "Procurement|PurchaseOrders|CanEdit",   "Procurement|PurchaseOrders|CanApprove",
            "Procurement|PurchaseOrders|CanArchive",
            "Procurement|Assets|CanView",
            "Procurement|AssetCategories|CanView",
            "Procurement|RoomCategories|CanView",
            "Procurement|Rooms|CanView",
            "Procurement|Tasks|CanView",

            // Employee: view-only on assets and rooms
            "Employee|Assets|CanView",
            "Employee|AssetCategories|CanView",
            "Employee|RoomCategories|CanView",
            "Employee|Rooms|CanView",
            "Employee|Tasks|CanView",
        };

        private static bool HasPermission(string role, string moduleName, string action)
            => _permissions.Contains($"{role}|{moduleName}|{action}");

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
                await Task.CompletedTask;
                return;
            }

            var user = context.HttpContext.User;

            if (user.Identity == null || !user.Identity.IsAuthenticated)
            {
                context.Result = new UnauthorizedResult();
                return;
            }

            // Super Admin bypasses all permission checks
            if (user.IsInRole("Super Admin"))
            {
                await Task.CompletedTask;
                return;
            }

            var role = user.FindFirst(ClaimTypes.Role)?.Value ?? string.Empty;

            // Check [RequirePermission] attributes — all must pass (AND semantics per action)
            foreach (var attr in attributes)
            {
                if (!HasPermission(role, attr.ModuleName, attr.Action))
                {
                    context.Result = new ForbidResult();
                    return;
                }
            }

            // Check [RequirePermissionOrRoles] attributes — permission OR explicit role match
            foreach (var attr in orRoleAttributes)
            {
                var permissionOk = HasPermission(role, attr.ModuleName, attr.Action);
                var roleOk = attr.AlternateRoles != null && attr.AlternateRoles.Contains(role, StringComparer.OrdinalIgnoreCase);
                if (!permissionOk && !roleOk)
                {
                    context.Result = new ForbidResult();
                    return;
                }
            }

            await Task.CompletedTask;
        }
    }
}
