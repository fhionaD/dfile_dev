using DFile.backend.Data;
using DFile.backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DFile.backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class RoleTemplatesController : ControllerBase
    {
        private readonly AppDbContext _context;

        public RoleTemplatesController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        [Authorize(Roles = "Super Admin")]
        public async Task<ActionResult<IEnumerable<object>>> GetRoleTemplates([FromQuery] bool showArchived = false)
        {
            var templates = await _context.RoleTemplates
                .Include(rt => rt.Permissions)
                .Where(rt => rt.IsArchived == showArchived)
                .OrderBy(rt => rt.Name)
                .Select(rt => new
                {
                    rt.Id,
                    rt.Name,
                    rt.Description,
                    rt.IsSystem,
                    rt.IsArchived,
                    rt.CreatedAt,
                    Permissions = rt.Permissions.Select(p => new
                    {
                        p.Id,
                        p.ModuleName,
                        p.CanView,
                        p.CanCreate,
                        p.CanEdit,
                        p.CanApprove,
                        p.CanArchive
                    }),
                    TenantCount = rt.TenantRoles.Count()
                })
                .ToListAsync();

            return Ok(templates);
        }

        /// <summary>
        /// Returns non-archived role templates for tenant-level assignment.
        /// Available to any authenticated user (not just Super Admin).
        /// </summary>
        [HttpGet("available")]
        [Authorize(Roles = "Super Admin,Admin")]
        public async Task<ActionResult> GetAvailableTemplates()
        {
            var templates = await _context.RoleTemplates
                .Where(rt => !rt.IsArchived)
                .Select(rt => new { rt.Id, rt.Name, rt.Description })
                .OrderBy(rt => rt.Name)
                .ToListAsync();
            return Ok(templates);
        }

        [HttpGet("{id}")]
        [Authorize(Roles = "Super Admin")]
        public async Task<ActionResult<object>> GetRoleTemplate(int id)
        {
            var template = await _context.RoleTemplates
                .Include(rt => rt.Permissions)
                .Where(rt => rt.Id == id)
                .Select(rt => new
                {
                    rt.Id,
                    rt.Name,
                    rt.Description,
                    rt.IsSystem,
                    rt.IsArchived,
                    rt.CreatedAt,
                    Permissions = rt.Permissions.Select(p => new
                    {
                        p.Id,
                        p.ModuleName,
                        p.CanView,
                        p.CanCreate,
                        p.CanEdit,
                        p.CanApprove,
                        p.CanArchive
                    }),
                    TenantCount = rt.TenantRoles.Count()
                })
                .FirstOrDefaultAsync();

            if (template == null) return NotFound();
            return Ok(template);
        }

        [HttpPost]
        [Authorize(Roles = "Super Admin")]
        public async Task<ActionResult> CreateRoleTemplate([FromBody] CreateRoleTemplateDto dto)
        {
            if (await _context.RoleTemplates.AnyAsync(rt => rt.Name == dto.Name && !rt.IsArchived))
                return BadRequest("A role template with this name already exists.");

            var template = new RoleTemplate
            {
                Name = dto.Name,
                Description = dto.Description,
                IsSystem = false,
                CreatedAt = DateTime.UtcNow
            };

            _context.RoleTemplates.Add(template);
            await _context.SaveChangesAsync();

            if (dto.Permissions != null)
            {
                foreach (var perm in dto.Permissions)
                {
                    _context.RolePermissions.Add(new RolePermission
                    {
                        RoleTemplateId = template.Id,
                        ModuleName = perm.ModuleName,
                        CanView = perm.CanView,
                        CanCreate = perm.CanCreate,
                        CanEdit = perm.CanEdit,
                        CanApprove = perm.CanApprove,
                        CanArchive = perm.CanArchive
                    });
                }
                await _context.SaveChangesAsync();
            }

            return CreatedAtAction(nameof(GetRoleTemplate), new { id = template.Id }, new { template.Id, template.Name });
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Super Admin")]
        public async Task<IActionResult> UpdateRoleTemplate(int id, [FromBody] CreateRoleTemplateDto dto)
        {
            var template = await _context.RoleTemplates
                .Include(rt => rt.Permissions)
                .FirstOrDefaultAsync(rt => rt.Id == id);

            if (template == null) return NotFound();
            if (template.IsSystem)
                return BadRequest("System role templates cannot be modified.");

            template.Name = dto.Name;
            template.Description = dto.Description;

            // Replace permissions
            _context.RolePermissions.RemoveRange(template.Permissions);

            if (dto.Permissions != null)
            {
                foreach (var perm in dto.Permissions)
                {
                    _context.RolePermissions.Add(new RolePermission
                    {
                        RoleTemplateId = template.Id,
                        ModuleName = perm.ModuleName,
                        CanView = perm.CanView,
                        CanCreate = perm.CanCreate,
                        CanEdit = perm.CanEdit,
                        CanApprove = perm.CanApprove,
                        CanArchive = perm.CanArchive
                    });
                }
            }

            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpPut("{id}/archive")]
        [Authorize(Roles = "Super Admin")]
        public async Task<IActionResult> ArchiveRoleTemplate(int id)
        {
            var template = await _context.RoleTemplates.FindAsync(id);
            if (template == null) return NotFound();
            if (template.IsSystem)
                return BadRequest("System role templates cannot be archived.");

            template.IsArchived = true;
            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpPut("{id}/restore")]
        [Authorize(Roles = "Super Admin")]
        public async Task<IActionResult> RestoreRoleTemplate(int id)
        {
            var template = await _context.RoleTemplates.FindAsync(id);
            if (template == null) return NotFound();

            template.IsArchived = false;
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }

    public class CreateRoleTemplateDto
    {
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public List<PermissionDto>? Permissions { get; set; }
    }

    public class PermissionDto
    {
        public string ModuleName { get; set; } = string.Empty;
        public bool CanView { get; set; }
        public bool CanCreate { get; set; }
        public bool CanEdit { get; set; }
        public bool CanApprove { get; set; }
        public bool CanArchive { get; set; }
    }
}
