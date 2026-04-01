using System.ComponentModel.DataAnnotations;
using DFile.backend.Data;
using DFile.backend.DTOs;
using DFile.backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
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

        /// <summary>Self-service org signup only. Super Admin cannot create tenants via API; use POST /api/Tenants/register.</summary>
        [HttpPost("register")]
        [AllowAnonymous]
        public Task<ActionResult<Tenant>> RegisterTenant([FromBody] CreateTenantDto dto) =>
            CreateTenantCoreAsync(dto);

        /// <summary>Anonymous preflight: whether admin email (and optionally organization name) can be used for registration.</summary>
        [HttpGet("register/availability")]
        [AllowAnonymous]
        public async Task<ActionResult<RegisterAvailabilityDto>> GetRegisterAvailability(
            [FromQuery] string? email,
            [FromQuery] string? tenantName = null)
        {
            if (string.IsNullOrWhiteSpace(email))
                return BadRequest(new { message = "Email is required." });

            var normEmail = NormalizeEmail(email);
            if (string.IsNullOrEmpty(normEmail) || !new EmailAddressAttribute().IsValid(normEmail))
                return BadRequest(new { message = "Enter a valid email address." });

            if (await _context.Users.AnyAsync(u => u.Email == normEmail))
                return Ok(new RegisterAvailabilityDto(false, "This email is already registered. Sign in instead."));

            if (!string.IsNullOrWhiteSpace(tenantName))
            {
                var trimmedName = tenantName.Trim();
                if (trimmedName.Length > 0 && await _context.Tenants.AnyAsync(t => t.Name == trimmedName))
                    return Ok(new RegisterAvailabilityDto(false, "An organization with this name already exists."));
            }

            return Ok(new RegisterAvailabilityDto(true));
        }

        private static string NormalizeEmail(string email) =>
            string.IsNullOrWhiteSpace(email) ? string.Empty : email.Trim().ToLowerInvariant();

        private static bool IsUniqueConstraintViolation(DbUpdateException ex)
        {
            for (var inner = ex.InnerException; inner != null; inner = inner.InnerException)
            {
                if (inner is SqlException sql && (sql.Number == 2601 || sql.Number == 2627))
                    return true;
            }
            return false;
        }

        private async Task<ActionResult<Tenant>> CreateTenantCoreAsync(CreateTenantDto dto)
        {
            var adminEmail = NormalizeEmail(dto.AdminEmail);
            var tenantName = string.IsNullOrWhiteSpace(dto.TenantName) ? string.Empty : dto.TenantName.Trim();

            if (string.IsNullOrEmpty(adminEmail))
                return BadRequest(new { message = "A valid work email is required." });

            if (await _context.Users.AnyAsync(u => u.Email == adminEmail))
                return BadRequest(new { message = "This email is already registered. Sign in instead." });

            if (string.IsNullOrEmpty(tenantName))
                return BadRequest(new { message = "Organization name is required." });

            if (await _context.Tenants.AnyAsync(t => t.Name == tenantName))
                return BadRequest(new { message = "An organization with this name already exists." });

            try
            {
                var tenant = Tenant.Create(tenantName, dto.SubscriptionPlan);
                tenant.BusinessAddress = dto.BusinessAddress?.Trim() ?? string.Empty;

                _context.Tenants.Add(tenant);
                await _context.SaveChangesAsync();

                var adminUser = new User
                {
                    FirstName = (dto.AdminFirstName ?? string.Empty).Trim(),
                    LastName = (dto.AdminLastName ?? string.Empty).Trim(),
                    Email = adminEmail,
                    Role = "Admin",
                    RoleLabel = "Admin",
                    TenantId = tenant.Id,
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.AdminPassword)
                };

                _context.Users.Add(adminUser);
                await _context.SaveChangesAsync();

                var systemTemplates = await _context.RoleTemplates
                    .Where(rt => rt.IsSystem && !rt.IsArchived)
                    .ToListAsync();

                foreach (var template in systemTemplates)
                {
                    _context.TenantRoles.Add(new TenantRole
                    {
                        TenantId = tenant.Id,
                        RoleTemplateId = template.Id
                    });
                }

                await _context.SaveChangesAsync();

                var adminTemplate = systemTemplates.FirstOrDefault(rt => rt.Name == "Admin");
                if (adminTemplate != null)
                {
                    var tenantRole = await _context.TenantRoles
                        .FirstAsync(tr => tr.TenantId == tenant.Id && tr.RoleTemplateId == adminTemplate.Id);
                    _context.UserRoleAssignments.Add(new UserRoleAssignment
                    {
                        UserId = adminUser.Id,
                        TenantRoleId = tenantRole.Id
                    });
                    await _context.SaveChangesAsync();
                }

                return CreatedAtAction(nameof(GetTenant), new { id = tenant.Id }, tenant);
            }
            catch (DbUpdateException ex) when (IsUniqueConstraintViolation(ex))
            {
                return BadRequest(new
                {
                    message = "This email is already registered, or that organization name is already in use. Sign in or choose a different name."
                });
            }
        }

        [HttpPost]
        public async Task<ActionResult<Tenant>> CreateTenant([FromBody] CreateTenantDto dto)
        {
            return await CreateTenantCoreAsync(dto);
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
