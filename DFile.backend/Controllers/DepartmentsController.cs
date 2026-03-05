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
    public class DepartmentsController : TenantAwareController
    {
        private readonly AppDbContext _context;

        public DepartmentsController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Department>>> GetDepartments([FromQuery] bool showArchived = false)
        {
            var tenantId = GetCurrentTenantId();
            var query = _context.Departments.AsQueryable();

            if (!IsSuperAdmin() && tenantId.HasValue)
            {
                query = query.Where(d => d.TenantId == tenantId);
            }

            if (showArchived)
            {
                query = query.Where(d => d.Status == "Archived");
            }
            else
            {
                query = query.Where(d => d.Status != "Archived");
            }

            return await query.ToListAsync();
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<Department>> GetDepartment(string id)
        {
            var tenantId = GetCurrentTenantId();
            var dept = await _context.Departments.FindAsync(id);

            if (dept == null) return NotFound();
            if (!IsSuperAdmin() && tenantId.HasValue && dept.TenantId != tenantId) return NotFound();

            return dept;
        }

        [HttpPost]
        public async Task<ActionResult<Department>> CreateDepartment(CreateDepartmentDto dto)
        {
            var tenantId = GetCurrentTenantId();

            var dept = new Department
            {
                Id = $"D-{DateTime.UtcNow:yyyyMMddHHmmssfff}",
                Name = dto.Name,
                Description = dto.Description,
                Head = dto.Head,
                Status = "Active",
                TenantId = IsSuperAdmin() ? null : tenantId
            };

            _context.Departments.Add(dept);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetDepartment), new { id = dept.Id }, dept);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateDepartment(string id, UpdateDepartmentDto dto)
        {
            var tenantId = GetCurrentTenantId();
            var existing = await _context.Departments.FindAsync(id);

            if (existing == null) return NotFound();
            if (!IsSuperAdmin() && tenantId.HasValue && existing.TenantId != tenantId) return NotFound();

            existing.Name = dto.Name;
            existing.Description = dto.Description;
            existing.Head = dto.Head;

            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpPut("archive/{id}")]
        public async Task<IActionResult> ArchiveDepartment(string id)
        {
            var tenantId = GetCurrentTenantId();
            var dept = await _context.Departments.FindAsync(id);

            if (dept == null) return NotFound();
            if (!IsSuperAdmin() && tenantId.HasValue && dept.TenantId != tenantId) return NotFound();

            dept.Status = "Archived";
            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpPut("restore/{id}")]
        public async Task<IActionResult> RestoreDepartment(string id)
        {
            var tenantId = GetCurrentTenantId();
            var dept = await _context.Departments.FindAsync(id);

            if (dept == null) return NotFound();
            if (!IsSuperAdmin() && tenantId.HasValue && dept.TenantId != tenantId) return NotFound();

            dept.Status = "Active";
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
