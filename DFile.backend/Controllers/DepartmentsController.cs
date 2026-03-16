using DFile.backend.Authorization;
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
    [Authorize]
    public class DepartmentsController : TenantAwareController
    {
        private readonly AppDbContext _context;

        public DepartmentsController(AppDbContext context)
        {
            _context = context;
        }

        private int? GetCurrentUserId()
        {
            var claim = User.FindFirst("UserId")?.Value ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            return string.IsNullOrEmpty(claim) ? null : int.Parse(claim);
        }

        [HttpGet]
        [RequirePermission("Departments", "CanView")]
        public async Task<ActionResult<IEnumerable<DepartmentResponseDto>>> GetDepartments([FromQuery] bool showArchived = false)
        {
            var tenantId = GetCurrentTenantId();
            var query = _context.Departments.AsQueryable();

            if (!IsSuperAdmin() && tenantId.HasValue)
            {
                query = query.Where(d => d.TenantId == tenantId);
            }

            query = query.Where(d => d.IsArchived == showArchived);

            var departments = await query.ToListAsync();

            // Resolve parent names
            var parentIds = departments.Where(d => d.ParentDepartmentId != null).Select(d => d.ParentDepartmentId!).Distinct().ToList();
            var parentNames = parentIds.Any()
                ? await _context.Departments.Where(d => parentIds.Contains(d.Id)).ToDictionaryAsync(d => d.Id, d => d.Name)
                : new Dictionary<string, string>();

            // Resolve user names
            var userIds = departments.SelectMany(d => new[] { d.CreatedBy, d.UpdatedBy }).Where(x => x.HasValue).Select(x => x!.Value).Distinct().ToList();
            var userNames = userIds.Any()
                ? await _context.Users.Where(u => userIds.Contains(u.Id)).ToDictionaryAsync(u => u.Id, u => u.FirstName + " " + u.LastName)
                : new Dictionary<int, string>();

            return Ok(departments.Select(d => new DepartmentResponseDto
            {
                Id = d.Id,
                DepartmentCode = d.DepartmentCode,
                Name = d.Name,
                Description = d.Description,
                ParentDepartmentId = d.ParentDepartmentId,
                ParentDepartmentName = d.ParentDepartmentId != null && parentNames.TryGetValue(d.ParentDepartmentId, out var pn) ? pn : null,
                IsArchived = d.IsArchived,
                CreatedAt = d.CreatedAt,
                UpdatedAt = d.UpdatedAt,
                CreatedByName = d.CreatedBy.HasValue && userNames.TryGetValue(d.CreatedBy.Value, out var cn) ? cn : null,
                UpdatedByName = d.UpdatedBy.HasValue && userNames.TryGetValue(d.UpdatedBy.Value, out var un) ? un : null,
                TenantId = d.TenantId
            }).ToList());
        }

        [HttpGet("{id}")]
        [RequirePermission("Departments", "CanView")]
        public async Task<ActionResult<DepartmentResponseDto>> GetDepartment(string id)
        {
            var tenantId = GetCurrentTenantId();
            var dept = await _context.Departments.FindAsync(id);

            if (dept == null) return NotFound();
            if (!IsSuperAdmin() && tenantId.HasValue && dept.TenantId != tenantId) return NotFound();

            string? parentName = null;
            if (dept.ParentDepartmentId != null)
            {
                var parent = await _context.Departments.FindAsync(dept.ParentDepartmentId);
                parentName = parent?.Name;
            }

            var userIds = new[] { dept.CreatedBy, dept.UpdatedBy }.Where(x => x.HasValue).Select(x => x!.Value).Distinct().ToList();
            var userNames = userIds.Any()
                ? await _context.Users.Where(u => userIds.Contains(u.Id)).ToDictionaryAsync(u => u.Id, u => u.FirstName + " " + u.LastName)
                : new Dictionary<int, string>();

            return Ok(new DepartmentResponseDto
            {
                Id = dept.Id,
                DepartmentCode = dept.DepartmentCode,
                Name = dept.Name,
                Description = dept.Description,
                ParentDepartmentId = dept.ParentDepartmentId,
                ParentDepartmentName = parentName,
                IsArchived = dept.IsArchived,
                CreatedAt = dept.CreatedAt,
                UpdatedAt = dept.UpdatedAt,
                CreatedByName = dept.CreatedBy.HasValue && userNames.TryGetValue(dept.CreatedBy.Value, out var cn) ? cn : null,
                UpdatedByName = dept.UpdatedBy.HasValue && userNames.TryGetValue(dept.UpdatedBy.Value, out var un) ? un : null,
                TenantId = dept.TenantId
            });
        }

        [HttpPost]
        [RequirePermission("Departments", "CanCreate")]
        public async Task<ActionResult<DepartmentResponseDto>> CreateDepartment(CreateDepartmentDto dto)
        {
            var tenantId = GetCurrentTenantId();
            var userId = GetCurrentUserId();

            var dept = new Department
            {
                Id = $"D-{DateTime.UtcNow:yyyyMMddHHmmssfff}",
                DepartmentCode = await RecordCodeGenerator.GenerateDepartmentCodeAsync(_context),
                Name = dto.Name,
                Description = dto.Description,
                ParentDepartmentId = dto.ParentDepartmentId,
                IsArchived = false,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                CreatedBy = userId,
                UpdatedBy = userId,
                TenantId = IsSuperAdmin() ? null : tenantId
            };

            _context.Departments.Add(dept);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetDepartment), new { id = dept.Id }, new DepartmentResponseDto
            {
                Id = dept.Id,
                DepartmentCode = dept.DepartmentCode,
                Name = dept.Name,
                Description = dept.Description,
                ParentDepartmentId = dept.ParentDepartmentId,
                IsArchived = dept.IsArchived,
                CreatedAt = dept.CreatedAt,
                UpdatedAt = dept.UpdatedAt,
                TenantId = dept.TenantId
            });
        }

        [HttpPut("{id}")]
        [RequirePermission("Departments", "CanEdit")]
        public async Task<IActionResult> UpdateDepartment(string id, UpdateDepartmentDto dto)
        {
            var tenantId = GetCurrentTenantId();
            var userId = GetCurrentUserId();
            var existing = await _context.Departments.FindAsync(id);

            if (existing == null) return NotFound();
            if (!IsSuperAdmin() && tenantId.HasValue && existing.TenantId != tenantId) return NotFound();

            existing.Name = dto.Name;
            existing.Description = dto.Description;
            existing.ParentDepartmentId = dto.ParentDepartmentId;
            existing.UpdatedAt = DateTime.UtcNow;
            existing.UpdatedBy = userId;

            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpPut("archive/{id}")]
        [RequirePermission("Departments", "CanArchive")]
        public async Task<IActionResult> ArchiveDepartment(string id)
        {
            var tenantId = GetCurrentTenantId();
            var userId = GetCurrentUserId();
            var dept = await _context.Departments.FindAsync(id);

            if (dept == null) return NotFound();
            if (!IsSuperAdmin() && tenantId.HasValue && dept.TenantId != tenantId) return NotFound();

            dept.IsArchived = true;
            dept.UpdatedAt = DateTime.UtcNow;
            dept.UpdatedBy = userId;
            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpPut("restore/{id}")]
        [RequirePermission("Departments", "CanArchive")]
        public async Task<IActionResult> RestoreDepartment(string id)
        {
            var tenantId = GetCurrentTenantId();
            var userId = GetCurrentUserId();
            var dept = await _context.Departments.FindAsync(id);

            if (dept == null) return NotFound();
            if (!IsSuperAdmin() && tenantId.HasValue && dept.TenantId != tenantId) return NotFound();

            dept.IsArchived = false;
            dept.UpdatedAt = DateTime.UtcNow;
            dept.UpdatedBy = userId;
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
