using DFile.backend.Core.Application.Services;
using DFile.backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using System.Linq;

namespace DFile.backend.Controllers
{
    [Authorize] 
    [Route("api/[controller]")]
    [ApiController]
    public class ProcurementController : ControllerBase
    {
        private readonly IProcurementService _procurementService;

        public ProcurementController(IProcurementService procurementService)
        {
            _procurementService = procurementService;
        }

        private int? GetTenantIdFromClaims()
        {
            var tenantIdStr = User.FindFirst("TenantId")?.Value;
            if (!string.IsNullOrEmpty(tenantIdStr) && int.TryParse(tenantIdStr, out int tenantId))
                return tenantId;
            return null;
        }

        private string? GetUserRole()
        {
            var role = User.FindFirst("role")?.Value;
            if (string.IsNullOrEmpty(role)) role = User.Claims.FirstOrDefault(c => c.Type.ToLower().Contains("role"))?.Value;
            return role;
        }

        private (bool ok, string? roleFound) AccessCheck(params string[] allowedRoles)
        {
            var role = GetUserRole();
            if (role == null) return (false, null);
            return (allowedRoles.Any(r => r.Equals(role, StringComparison.OrdinalIgnoreCase)), role);
        }

        private IActionResult ForbiddenResponse(string action, string? roleFound)
        {
            return StatusCode(403, new 
            { 
                error = "Forbidden", 
                message = $"Role '{roleFound}' is not authorized for {action}.",
                roleFound = roleFound,
                userId = User.FindFirst("sub")?.Value
            });
        }

        [HttpGet]
        public async Task<IActionResult> GetPurchaseOrders([FromQuery] bool showArchived = false)
        {
            var check = AccessCheck("Admin", "Tenant Admin", "Super Admin", "Finance", "Procurement", "Employee");
            if (!check.ok) return ForbiddenResponse("View Purchase Orders", check.roleFound);
            
            var tenantId = GetTenantIdFromClaims();
            var orders = await _procurementService.GetPurchaseOrdersAsync(tenantId, showArchived);
            return Ok(orders);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetPurchaseOrder(string id)
        {
            var check = AccessCheck("Admin", "Tenant Admin", "Super Admin", "Finance", "Procurement", "Employee");
            if (!check.ok) return ForbiddenResponse("View Purchase Order", check.roleFound);

            var order = await _procurementService.GetPurchaseOrderByIdAsync(id);
            if (order == null) return NotFound();
            return Ok(order);
        }

        [HttpPost]
        public async Task<IActionResult> PostPurchaseOrder(PurchaseOrder order)
        {
            var check = AccessCheck("Admin", "Tenant Admin", "Super Admin", "Finance", "Procurement");
            if (!check.ok) return ForbiddenResponse("Create Purchase Order", check.roleFound);

            var tenantId = GetTenantIdFromClaims();
            var createdOrder = await _procurementService.CreatePurchaseOrderAsync(order, tenantId);
            return CreatedAtAction(nameof(GetPurchaseOrder), new { id = createdOrder.Id }, createdOrder);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> PutPurchaseOrder(string id, PurchaseOrder order)
        {
            var check = AccessCheck("Admin", "Tenant Admin", "Super Admin", "Finance", "Procurement");
            if (!check.ok) return ForbiddenResponse("Edit Purchase Order", check.roleFound);

            if (id != order.Id) return BadRequest("ID mismatch");
            await _procurementService.UpdatePurchaseOrderAsync(order);
            return NoContent();
        }

        [HttpPut("archive/{id}")]
        public async Task<IActionResult> ArchiveOrder(string id)
        {
            var check = AccessCheck("Admin", "Tenant Admin", "Super Admin");
            if (!check.ok) return ForbiddenResponse("Archive Order", check.roleFound);
            await _procurementService.ArchiveOrderAsync(id);
            return NoContent();
        }

        [HttpPut("restore/{id}")]
        public async Task<IActionResult> RestoreOrder(string id)
        {
            var check = AccessCheck("Admin", "Tenant Admin", "Super Admin");
            if (!check.ok) return ForbiddenResponse("Restore Order", check.roleFound);
            await _procurementService.RestoreOrderAsync(id);
            return NoContent();
        }
    }
}
