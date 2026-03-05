using DFile.backend.Data;
using DFile.backend.DTOs;
using DFile.backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DFile.backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Admin,Super Admin")]
    public class RolesController : TenantAwareController
    {
        private readonly AppDbContext _context;

        public RolesController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Role>>> GetRoles([FromQuery] bool showArchived = false)
        {
            var tenantId = GetCurrentTenantId();
            var query = _context.Roles.AsQueryable();

            if (!IsSuperAdmin() && tenantId.HasValue)
            {
                query = query.Where(r => r.TenantId == tenantId);
            }

            if (showArchived)
            {
                query = query.Where(r => r.Status == "Archived");
            }
            else
            {
                query = query.Where(r => r.Status != "Archived");
            }

            return await query.ToListAsync();
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Role>> GetRole(string id)
        {
            var tenantId = GetCurrentTenantId();
            var role = await _context.Roles.FindAsync(id);

            if (role == null) return NotFound();
            if (!IsSuperAdmin() && tenantId.HasValue && role.TenantId != tenantId) return NotFound();

            return role;
        }

        [HttpPost]
        public async Task<ActionResult<Role>> CreateRole(CreateRoleDto dto)
        {
            var tenantId = GetCurrentTenantId();

            var role = new Role
            {
                Id = $"RL-{DateTime.UtcNow:yyyyMMddHHmmssfff}",
                Designation = dto.Designation,
                Department = dto.Department,
                Scope = dto.Scope,
                Status = "Active",
                TenantId = IsSuperAdmin() ? null : tenantId
            };

            _context.Roles.Add(role);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetRole), new { id = role.Id }, role);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateRole(string id, UpdateRoleDto dto)
        {
            var tenantId = GetCurrentTenantId();
            var existing = await _context.Roles.FindAsync(id);

            if (existing == null) return NotFound();
            if (!IsSuperAdmin() && tenantId.HasValue && existing.TenantId != tenantId) return NotFound();

            existing.Designation = dto.Designation;
            existing.Department = dto.Department;
            existing.Scope = dto.Scope;

            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpPut("archive/{id}")]
        public async Task<IActionResult> ArchiveRole(string id)
        {
            var tenantId = GetCurrentTenantId();
            var role = await _context.Roles.FindAsync(id);

            if (role == null) return NotFound();
            if (!IsSuperAdmin() && tenantId.HasValue && role.TenantId != tenantId) return NotFound();

            role.Status = "Archived";
            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpPut("restore/{id}")]
        public async Task<IActionResult> RestoreRole(string id)
        {
            var tenantId = GetCurrentTenantId();
            var role = await _context.Roles.FindAsync(id);

            if (role == null) return NotFound();
            if (!IsSuperAdmin() && tenantId.HasValue && role.TenantId != tenantId) return NotFound();

            role.Status = "Active";
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
