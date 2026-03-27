using DFile.backend.Authorization;
using DFile.backend.Data;
using DFile.backend.DTOs;
using DFile.backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace DFile.backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class RolesController : TenantAwareController
    {
        private readonly AppDbContext _context;

        public RolesController(AppDbContext context)
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
        public async Task<ActionResult<IEnumerable<RoleResponseDto>>> GetRoles([FromQuery] bool showArchived = false)
        {
            var tenantId = GetCurrentTenantId();
            var query = _context.Roles.Include(r => r.Department).AsQueryable();

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

            var roles = await query.Select(r => new RoleResponseDto
            {
                Id = r.Id,
                RoleCode = r.RoleCode,
                Designation = r.Designation,
                DepartmentId = r.DepartmentId,
                DepartmentName = r.Department != null ? r.Department.Name : "",
                Description = r.Description,
                Status = r.Status,
                CreatedAt = r.CreatedAt,
                EditedAt = r.EditedAt
            }).ToListAsync();

            return roles;
        }

        [HttpGet("{id}")]
        [RequirePermission("Departments", "CanView")]
        public async Task<ActionResult<RoleResponseDto>> GetRole(string id)
        {
            var tenantId = GetCurrentTenantId();
            var role = await _context.Roles.Include(r => r.Department).FirstOrDefaultAsync(r => r.Id == id);

            if (role == null) return NotFound();
            if (!IsSuperAdmin() && tenantId.HasValue && role.TenantId != tenantId) return NotFound();

            return new RoleResponseDto
            {
                Id = role.Id,
                RoleCode = role.RoleCode,
                Designation = role.Designation,
                DepartmentId = role.DepartmentId,
                DepartmentName = role.Department?.Name ?? "",
                Description = role.Description,
                Status = role.Status,
                CreatedAt = role.CreatedAt,
                EditedAt = role.EditedAt
            };
        }

        [HttpPost]
        [RequirePermission("Departments", "CanCreate")]
        public async Task<ActionResult<RoleResponseDto>> CreateRole(CreateRoleDto dto)
        {
            var tenantId = GetCurrentTenantId();
            var userId = GetCurrentUserId();

            string? departmentName = null;
            if (!string.IsNullOrEmpty(dto.DepartmentId))
            {
                var dept = await _context.Departments.FindAsync(dto.DepartmentId);
                if (dept == null) return BadRequest(new { message = "Department not found." });
                departmentName = dept.Name;
            }

            var role = new Role
            {
                Id = $"RL-{DateTime.UtcNow:yyyyMMddHHmmssfff}",
                RoleCode = await RecordCodeGenerator.GenerateRoleCodeAsync(_context),
                Designation = dto.Designation,
                DepartmentId = dto.DepartmentId,
                Description = dto.Description,
                Status = "Active",
                CreatedAt = DateTime.UtcNow,
                TenantId = IsSuperAdmin() ? null : tenantId
            };

            _context.Roles.Add(role);

            _context.AuditLogs.Add(new AuditLog
            {
                Action = "Create",
                EntityType = "Role",
                EntityId = role.Id,
                Module = "Organization",
                UserId = userId,
                TenantId = tenantId,
                NewValues = JsonSerializer.Serialize(new { dto.Designation, dto.DepartmentId, dto.Description }),
                IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
                UserAgent = Request.Headers.UserAgent.ToString()
            });

            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetRole), new { id = role.Id }, new RoleResponseDto
            {
                Id = role.Id,
                RoleCode = role.RoleCode,
                Designation = role.Designation,
                DepartmentId = role.DepartmentId,
                DepartmentName = departmentName ?? "",
                Description = role.Description,
                Status = role.Status,
                CreatedAt = role.CreatedAt,
                EditedAt = role.EditedAt
            });
        }

        [HttpPut("{id}")]
        [RequirePermission("Departments", "CanEdit")]
        public async Task<IActionResult> UpdateRole(string id, UpdateRoleDto dto)
        {
            var tenantId = GetCurrentTenantId();
            var userId = GetCurrentUserId();
            var existing = await _context.Roles.FindAsync(id);

            if (existing == null) return NotFound();
            if (!IsSuperAdmin() && tenantId.HasValue && existing.TenantId != tenantId) return NotFound();

            if (!string.IsNullOrEmpty(dto.DepartmentId))
            {
                var dept = await _context.Departments.FindAsync(dto.DepartmentId);
                if (dept == null) return BadRequest(new { message = "Department not found." });
            }

            var oldValues = JsonSerializer.Serialize(new { existing.Designation, existing.DepartmentId, existing.Description });

            existing.Designation = dto.Designation;
            existing.DepartmentId = dto.DepartmentId;
            existing.Description = dto.Description;
            existing.EditedAt = DateTime.UtcNow;

            _context.AuditLogs.Add(new AuditLog
            {
                Action = "Update",
                EntityType = "Role",
                EntityId = id,
                Module = "Organization",
                UserId = userId,
                TenantId = tenantId,
                OldValues = oldValues,
                NewValues = JsonSerializer.Serialize(new { dto.Designation, dto.DepartmentId, dto.Description }),
                IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
                UserAgent = Request.Headers.UserAgent.ToString()
            });

            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpPut("archive/{id}")]
        [RequirePermission("Departments", "CanArchive")]
        public async Task<IActionResult> ArchiveRole(string id)
        {
            var tenantId = GetCurrentTenantId();
            var userId = GetCurrentUserId();
            var role = await _context.Roles.FindAsync(id);

            if (role == null) return NotFound();
            if (!IsSuperAdmin() && tenantId.HasValue && role.TenantId != tenantId) return NotFound();

            role.Status = "Archived";

            _context.AuditLogs.Add(new AuditLog
            {
                Action = "Archive",
                EntityType = "Role",
                EntityId = id,
                Module = "Organization",
                UserId = userId,
                TenantId = tenantId,
                NewValues = JsonSerializer.Serialize(new { role.Designation, Status = "Archived" }),
                IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
                UserAgent = Request.Headers.UserAgent.ToString()
            });

            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpPut("restore/{id}")]
        [RequirePermission("Departments", "CanArchive")]
        public async Task<IActionResult> RestoreRole(string id)
        {
            var tenantId = GetCurrentTenantId();
            var userId = GetCurrentUserId();
            var role = await _context.Roles.FindAsync(id);

            if (role == null) return NotFound();
            if (!IsSuperAdmin() && tenantId.HasValue && role.TenantId != tenantId) return NotFound();

            role.Status = "Active";

            _context.AuditLogs.Add(new AuditLog
            {
                Action = "Restore",
                EntityType = "Role",
                EntityId = id,
                Module = "Organization",
                UserId = userId,
                TenantId = tenantId,
                NewValues = JsonSerializer.Serialize(new { role.Designation, Status = "Active" }),
                IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
                UserAgent = Request.Headers.UserAgent.ToString()
            });

            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
