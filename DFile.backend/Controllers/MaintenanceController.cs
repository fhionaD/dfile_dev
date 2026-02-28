using DFile.backend.Data;
using DFile.backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Linq;

namespace DFile.backend.Controllers
{
    [Authorize]
    [Route("api/maintenance")]
    [ApiController]
    public class MaintenanceController : ControllerBase
    {
        private readonly AppDbContext _context;

        public MaintenanceController(AppDbContext context)
        {
            _context = context;
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
            Console.WriteLine($"[Maintenance Auth] DENIED - Role: '{roleFound}', Action: {action}, Path: {Request.Path}");
            return StatusCode(403, new 
            { 
                error = "Forbidden", 
                message = $"Role '{roleFound}' is not authorized for {action}.",
                roleFound = roleFound,
                userId = User.FindFirst("sub")?.Value
            });
        }

        [HttpGet]
        public async Task<IActionResult> GetMaintenanceRecords([FromQuery] bool showArchived = false)
        {
            var check = AccessCheck("Admin", "Tenant Admin", "Super Admin", "Maintenance", "Finance", "Employee", "Procurement");
            if (!check.ok) return ForbiddenResponse("View Records", check.roleFound);

            var tenantId = GetTenantIdFromClaims();
            IQueryable<MaintenanceRecord> query = _context.MaintenanceRecords;

            if (tenantId.HasValue)
            {
                query = query.Where(r => r.TenantId == tenantId.Value);
            }

            var records = await query.Where(r => r.Archived == showArchived).OrderByDescending(r => r.CreatedAt).ToListAsync();
            return Ok(records);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetMaintenanceRecord(string id)
        {
            var check = AccessCheck("Admin", "Tenant Admin", "Super Admin", "Maintenance", "Finance", "Employee", "Procurement");
            if (!check.ok) return ForbiddenResponse("View Record", check.roleFound);

            var record = await _context.MaintenanceRecords.FindAsync(id);
            if (record == null) return NotFound();
            return Ok(record);
        }

        [HttpPost]
        public async Task<IActionResult> PostMaintenanceRecord(MaintenanceRecord record)
        {
            var check = AccessCheck("Admin", "Tenant Admin", "Super Admin", "Maintenance", "Finance", "Employee");
            if (!check.ok) return ForbiddenResponse("Create Record", check.roleFound);

            var tenantId = GetTenantIdFromClaims();
            if (tenantId.HasValue)
            {
                var tenant = await _context.Tenants.FindAsync(tenantId.Value);
                if (tenant != null && !tenant.MaintenanceModule)
                {
                    return BadRequest(new { message = "Maintenance module is not available on your current subscription plan." });
                }
                record.TenantId = tenantId.Value;
            }

            if (string.IsNullOrEmpty(record.Id)) record.Id = Guid.NewGuid().ToString();
            record.CreatedAt = DateTime.UtcNow;
            _context.MaintenanceRecords.Add(record);
            await _context.SaveChangesAsync();
            return CreatedAtAction("GetMaintenanceRecord", new { id = record.Id }, record);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> PutMaintenanceRecord(string id, MaintenanceRecord record)
        {
            var check = AccessCheck("Admin", "Tenant Admin", "Super Admin", "Maintenance");
            if (!check.ok) return ForbiddenResponse("Edit Record", check.roleFound);
            _context.Entry(record).State = EntityState.Modified;
            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpPut("archive/{id}")]
        public async Task<IActionResult> ArchiveMaintenanceRecord(string id)
        {
            var check = AccessCheck("Admin", "Tenant Admin", "Super Admin", "Maintenance");
            if (!check.ok) return ForbiddenResponse("Archive Record", check.roleFound);
            var record = await _context.MaintenanceRecords.FindAsync(id);
            if (record == null) return NotFound();
            record.Archived = true;
            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpPut("restore/{id}")]
        public async Task<IActionResult> RestoreMaintenanceRecord(string id)
        {
            var check = AccessCheck("Admin", "Tenant Admin", "Super Admin", "Maintenance");
            if (!check.ok) return ForbiddenResponse("Restore Record", check.roleFound);
            var record = await _context.MaintenanceRecords.FindAsync(id);
            if (record == null) return NotFound();
            record.Archived = false;
            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteMaintenanceRecord(string id)
        {
            var check = AccessCheck("Admin", "Tenant Admin", "Super Admin", "Maintenance");
            if (!check.ok) return ForbiddenResponse("Delete Record", check.roleFound);
            var record = await _context.MaintenanceRecords.FindAsync(id);
            if (record == null) return NotFound();
            _context.MaintenanceRecords.Remove(record);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
