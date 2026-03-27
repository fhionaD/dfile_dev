using DFile.backend.Data;
using DFile.backend.DTOs;
using DFile.backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using BCrypt.Net;

namespace DFile.backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Super Admin")]
    public class TenantsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public TenantsController(AppDbContext context)
        {
            _context = context;
        }

        [HttpPost]
        public async Task<ActionResult<Tenant>> CreateTenant([FromBody] CreateTenantDto dto)
        {
            // Optional: Check if caller is Super Admin
            // if (!User.IsInRole("Super Admin")) return Forbid();

            if (await _context.Users.AnyAsync(u => u.Email == dto.AdminEmail))
            {
                return BadRequest("User with this email already exists.");
            }

            if (await _context.Tenants.AnyAsync(t => t.Name == dto.TenantName))
            {
                return BadRequest("Tenant with this name already exists.");
            }

            var tenant = Tenant.Create(dto.TenantName, dto.SubscriptionPlan);
            tenant.BusinessAddress = dto.BusinessAddress;
            
            _context.Tenants.Add(tenant);
            await _context.SaveChangesAsync(); // Save to get Tenant ID

            var adminUser = new User
            {
                FirstName = dto.AdminFirstName,
                LastName = dto.AdminLastName,
                Email = dto.AdminEmail,
                Role = "Admin",
                RoleLabel = "Admin",
                TenantId = tenant.Id,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.AdminPassword)
            };

            _context.Users.Add(adminUser);
            await _context.SaveChangesAsync();

            return CreatedAtAction("GetTenant", new { id = tenant.Id }, tenant);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Tenant>> GetTenant(int id)
        {
            var tenant = await _context.Tenants.FindAsync(id);

            if (tenant == null)
            {
                return NotFound();
            }

            return tenant;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Tenant>>> GetTenants()
        {
            var tenants = await _context.Tenants.ToListAsync();
            return Ok(tenants);
        }

        [HttpPut("{id}/status")]
        public async Task<IActionResult> UpdateTenantStatus(int id, [FromBody] UpdateStatusDto dto)
        {
            var tenant = await _context.Tenants.FindAsync(id);
            if (tenant == null) return NotFound();

            if (dto.Status != "Active" && dto.Status != "Inactive" && dto.Status != "Archived" && dto.Status != "Suspended")
                return BadRequest("Invalid status. Must be Active, Inactive, Archived, or Suspended.");

            tenant.Status = dto.Status;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Status updated", status = tenant.Status });
        }

        [HttpGet("metrics")]
        public async Task<ActionResult> GetPlatformMetrics()
        {
            var totalTenants = await _context.Tenants.CountAsync();
            var activeTenants = await _context.Tenants.CountAsync(t => t.Status == "Active");
            var suspendedTenants = await _context.Tenants.CountAsync(t => t.Status == "Suspended");
            var totalUsers = await _context.Users.CountAsync();
            var totalAssets = await _context.Assets.CountAsync(a => !a.IsArchived);
            var totalRooms = await _context.Rooms.CountAsync();
            var totalMaintenanceRecords = await _context.MaintenanceRecords.CountAsync();
            var pendingOrders = await _context.PurchaseOrders.CountAsync(p => p.Status == "Pending" && !p.IsArchived);
            var openMaintenanceRecords = await _context.MaintenanceRecords.CountAsync(m => m.Status != "Completed" && !m.IsArchived);

            return Ok(new
            {
                totalTenants,
                activeTenants,
                suspendedTenants,
                totalUsers,
                totalAssets,
                totalRooms,
                totalMaintenanceRecords,
                pendingOrders,
                openMaintenanceRecords
            });
        }

        [HttpGet("risk-indicators")]
        public async Task<ActionResult> GetRiskIndicators()
        {
            var now = DateTime.UtcNow;

            var expiredWarranties = await _context.Assets
                .CountAsync(a => !a.IsArchived && a.WarrantyExpiry != null && a.WarrantyExpiry < now);

            var overdueMaintenanceCount = await _context.MaintenanceRecords
                .CountAsync(m => !m.IsArchived && m.Status != "Completed" && m.EndDate != null && m.EndDate < now);

            var highPriorityPending = await _context.MaintenanceRecords
                .CountAsync(m => !m.IsArchived && m.Priority == "High" && m.Status == "Pending");

            var fullyDepreciated = await _context.Assets
                .CountAsync(a => !a.IsArchived && a.CurrentBookValue <= 0);

            var suspendedTenants = await _context.Tenants
                .CountAsync(t => t.Status == "Suspended");

            return Ok(new
            {
                expiredWarranties,
                overdueMaintenanceCount,
                highPriorityPending,
                fullyDepreciated,
                suspendedTenants
            });
        }
    }
}
