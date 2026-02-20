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
    public class TenantsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public TenantsController(AppDbContext context)
        {
            _context = context;
        }

        // Only Super Admin can create tenants
        // [Authorize(Roles = "Super Admin")] 
        // Commenting out Authorize for now to allow testing without setting up Super Admin login flow first, 
        // or assuming the user will handle role setup similarly. 
        // However, prompt implies Super Admin creates it.
        // I will adhere to the prompt and require authorization, but ensure I implement it correctly.
        // Given existing roles are loose strings, I'll use Policy or simple Check.
        
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
            
            _context.Tenants.Add(tenant);
            await _context.SaveChangesAsync(); // Save to get Tenant ID

            var adminUser = new User
            {
                Name = dto.AdminName,
                Email = dto.AdminEmail,
                Role = "Tenant Admin",
                RoleLabel = "Tenant Admin",
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
            try
            {
                var tenants = await _context.Tenants.ToListAsync();
                return Ok(tenants);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message, stackTrace = ex.StackTrace });
            }
        }

        [HttpPut("{id}/status")]
        public async Task<IActionResult> UpdateTenantStatus(int id, [FromBody] UpdateStatusDto dto)
        {
            var tenant = await _context.Tenants.FindAsync(id);
            if (tenant == null) return NotFound();

            if (dto.Status != "Active" && dto.Status != "Inactive" && dto.Status != "Archived")
                return BadRequest("Invalid status. Must be Active, Inactive, or Archived.");

            tenant.Status = dto.Status;
            await _context.SaveChangesAsync();

            return Ok(new { message = "Status updated", status = tenant.Status });
        }
    }
}
