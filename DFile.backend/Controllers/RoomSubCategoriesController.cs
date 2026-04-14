using DFile.backend.Authorization;
using DFile.backend.Data;
using DFile.backend.DTOs;
using DFile.backend.Models;
using DFile.backend.Services;
using Microsoft.Data.SqlClient;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace DFile.backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class RoomSubCategoriesController : TenantAwareController
    {
        private readonly AppDbContext _context;
        private readonly IAuditService _auditService;

        public RoomSubCategoriesController(AppDbContext context, IAuditService auditService)
        {
            _context = context;
            _auditService = auditService;
        }

        private int? GetCurrentUserId()
        {
            var claim = User.FindFirst("UserId")?.Value ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            return string.IsNullOrEmpty(claim) ? null : int.Parse(claim);
        }

        private static bool IsUniqueConstraintViolation(DbUpdateException ex)
        {
            if (ex.InnerException is SqlException sqlEx)
            {
                return sqlEx.Number == 2601 || sqlEx.Number == 2627;
            }

            return false;
        }

        [HttpGet]
        [RequirePermission("RoomCategories", "CanView")]
        public async Task<ActionResult<IEnumerable<RoomSubCategoryResponseDto>>> GetRoomSubCategories(
            [FromQuery] string? roomCategoryId = null,
            [FromQuery] bool showArchived = false)
        {
            var tenantId = GetCurrentTenantId();

            var query = _context.RoomSubCategories
                .Include(s => s.RoomCategory)
                .Include(s => s.CreatedByUser)
                .Include(s => s.UpdatedByUser)
                .Where(s => s.IsArchived == showArchived);

            if (!IsSuperAdmin() && tenantId.HasValue)
            {
                query = query.Where(s => s.TenantId == tenantId);
            }

            if (!string.IsNullOrEmpty(roomCategoryId))
            {
                query = query.Where(s => s.RoomCategoryId == roomCategoryId);
            }

            var subCategories = await query.ToListAsync();

            var result = subCategories.Select(s => new RoomSubCategoryResponseDto
            {
                Id = s.Id,
                SubCategoryCode = s.SubCategoryCode,
                Name = s.Name,
                Description = s.Description,
                RoomCategoryId = s.RoomCategoryId,
                CategoryName = s.RoomCategory?.Name,
                IsArchived = s.IsArchived,
                TenantId = s.TenantId,
                CreatedByName = s.CreatedByUser != null ? s.CreatedByUser.FirstName + " " + s.CreatedByUser.LastName : null,
                UpdatedByName = s.UpdatedByUser != null ? s.UpdatedByUser.FirstName + " " + s.UpdatedByUser.LastName : null,
                CreatedAt = s.CreatedAt,
                UpdatedAt = s.UpdatedAt,
                RowVersion = s.RowVersion
            }).ToList();

            return Ok(result);
        }

        [HttpGet("{id}")]
        [RequirePermission("RoomCategories", "CanView")]
        public async Task<ActionResult<RoomSubCategoryResponseDto>> GetRoomSubCategory(string id)
        {
            var tenantId = GetCurrentTenantId();
            var sub = await _context.RoomSubCategories
                .Include(s => s.RoomCategory)
                .Include(s => s.CreatedByUser)
                .Include(s => s.UpdatedByUser)
                .FirstOrDefaultAsync(s => s.Id == id);

            if (sub == null) return NotFound();
            if (!IsSuperAdmin() && tenantId.HasValue && sub.TenantId != tenantId) return NotFound();

            return Ok(new RoomSubCategoryResponseDto
            {
                Id = sub.Id,
                SubCategoryCode = sub.SubCategoryCode,
                Name = sub.Name,
                Description = sub.Description,
                RoomCategoryId = sub.RoomCategoryId,
                CategoryName = sub.RoomCategory?.Name,
                IsArchived = sub.IsArchived,
                TenantId = sub.TenantId,
                CreatedByName = sub.CreatedByUser != null ? sub.CreatedByUser.FirstName + " " + sub.CreatedByUser.LastName : null,
                UpdatedByName = sub.UpdatedByUser != null ? sub.UpdatedByUser.FirstName + " " + sub.UpdatedByUser.LastName : null,
                CreatedAt = sub.CreatedAt,
                UpdatedAt = sub.UpdatedAt,
                RowVersion = sub.RowVersion
            });
        }

        [HttpPost]
        [RequirePermission("RoomCategories", "CanCreate")]
        public async Task<ActionResult<RoomSubCategoryResponseDto>> PostRoomSubCategory(CreateRoomSubCategoryDto dto)
        {
            var tenantId = GetCurrentTenantId();
            var userId = GetCurrentUserId();

            var trimmedName = dto.Name?.Trim() ?? string.Empty;

            if (string.IsNullOrWhiteSpace(trimmedName))
                return BadRequest(new { message = "Sub-category name is required." });

            // Validate parent category exists
            var parentCategory = await _context.RoomCategories.FirstOrDefaultAsync(c =>
                c.Id == dto.RoomCategoryId &&
                !c.IsArchived &&
                (IsSuperAdmin() ? c.TenantId == null : c.TenantId == tenantId));
            if (parentCategory == null)
                return BadRequest(new { message = "Invalid or archived room category." });

            var nameLower = trimmedName.ToLower();

            var nameExists = await _context.RoomSubCategories.AnyAsync(s =>
                s.RoomCategoryId == dto.RoomCategoryId &&
                s.Name.ToLower() == nameLower &&
                !s.IsArchived &&
                (IsSuperAdmin() ? s.TenantId == null : s.TenantId == tenantId));
            if (nameExists)
                return Conflict(new { message = "This sub-category name already exists under this category." });

            var subCategory = new RoomSubCategory
            {
                Id = await RecordCodeGenerator.GenerateRoomSubCategoryIdAsync(_context),
                SubCategoryCode = await RecordCodeGenerator.GenerateRoomSubCategoryCodeAsync(_context),
                Name = trimmedName,
                Description = dto.Description?.Trim() ?? string.Empty,
                RoomCategoryId = dto.RoomCategoryId,
                IsArchived = false,
                TenantId = IsSuperAdmin() ? null : tenantId,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                CreatedBy = userId,
                UpdatedBy = userId
            };

            _context.RoomSubCategories.Add(subCategory);

            _auditService.Add(HttpContext, new AuditLog
            {
                Action = "Create",
                EntityType = "RoomSubCategory",
                EntityId = subCategory.Id,
                Module = "Configuration",
                UserId = userId,
                TenantId = tenantId,
                NewValues = JsonSerializer.Serialize(new { subCategory.Name, subCategory.Description, subCategory.RoomCategoryId }),
            });

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException ex) when (IsUniqueConstraintViolation(ex))
            {
                return Conflict(new { message = "This sub-category name already exists under this category." });
            }

            return CreatedAtAction("GetRoomSubCategory", new { id = subCategory.Id }, new RoomSubCategoryResponseDto
            {
                Id = subCategory.Id,
                SubCategoryCode = subCategory.SubCategoryCode,
                Name = subCategory.Name,
                Description = subCategory.Description,
                RoomCategoryId = subCategory.RoomCategoryId,
                CategoryName = parentCategory.Name,
                IsArchived = subCategory.IsArchived,
                TenantId = subCategory.TenantId,
                CreatedAt = subCategory.CreatedAt,
                UpdatedAt = subCategory.UpdatedAt,
                RowVersion = subCategory.RowVersion
            });
        }

        [HttpPut("{id}")]
        [RequirePermission("RoomCategories", "CanEdit")]
        public async Task<IActionResult> PutRoomSubCategory(string id, UpdateRoomSubCategoryDto dto)
        {
            var tenantId = GetCurrentTenantId();
            var userId = GetCurrentUserId();
            var existing = await _context.RoomSubCategories.FindAsync(id);

            if (existing == null) return NotFound();
            if (!IsSuperAdmin() && tenantId.HasValue && existing.TenantId != tenantId) return NotFound();

            var trimmedName = dto.Name?.Trim() ?? string.Empty;

            if (string.IsNullOrWhiteSpace(trimmedName))
                return BadRequest(new { message = "Sub-category name is required." });

            if (existing.Name.ToLower() != trimmedName.ToLower())
            {
                var nameLower = trimmedName.ToLower();

                var nameExists = await _context.RoomSubCategories.AnyAsync(s =>
                    s.Id != id &&
                    s.RoomCategoryId == existing.RoomCategoryId &&
                    s.Name.ToLower() == nameLower &&
                    !s.IsArchived &&
                    (IsSuperAdmin() ? s.TenantId == null : s.TenantId == tenantId));
                if (nameExists)
                    return Conflict(new { message = "This sub-category name already exists under this category." });
            }

            if (dto.RowVersion != null)
            {
                _context.Entry(existing).Property(p => p.RowVersion).OriginalValue = dto.RowVersion;
            }

            var oldValues = JsonSerializer.Serialize(new { existing.Name, existing.Description });

            existing.Name = trimmedName;
            existing.Description = dto.Description?.Trim() ?? string.Empty;
            existing.UpdatedAt = DateTime.UtcNow;
            existing.UpdatedBy = userId;

            _auditService.Add(HttpContext, new AuditLog
            {
                Action = "Update",
                EntityType = "RoomSubCategory",
                EntityId = id,
                Module = "Configuration",
                UserId = userId,
                TenantId = tenantId,
                OldValues = oldValues,
                NewValues = JsonSerializer.Serialize(new { Name = trimmedName, Description = existing.Description }),
            });

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                return Conflict(new { message = "This record was modified by another user. Please refresh and try again." });
            }
            catch (DbUpdateException ex) when (IsUniqueConstraintViolation(ex))
            {
                return Conflict(new { message = "This sub-category name already exists under this category." });
            }

            return NoContent();
        }

        [HttpPatch("{id}/archive")]
        [RequirePermission("RoomCategories", "CanArchive")]
        public async Task<IActionResult> ArchiveRoomSubCategory(string id)
        {
            var tenantId = GetCurrentTenantId();
            var userId = GetCurrentUserId();
            var sub = await _context.RoomSubCategories.FindAsync(id);

            if (sub == null) return NotFound();
            if (!IsSuperAdmin() && tenantId.HasValue && sub.TenantId != tenantId) return NotFound();

            var roomsUsingSub = await _context.Rooms.AsNoTracking()
                .Where(r => r.SubCategoryId == id && !r.IsArchived)
                .AnyAsync();
            if (roomsUsingSub)
            {
                return Conflict(new
                {
                    message = "This sub-category is assigned to one or more room units. Update or archive those units before archiving this sub-category.",
                });
            }

            var hasActiveAllocations = await _context.AssetAllocations
                .AsNoTracking()
                .Where(a => a.Status == "Active")
                .AnyAsync(a =>
                    _context.Rooms.AsNoTracking().Any(r =>
                        r.Id == a.RoomId && r.SubCategoryId == id && !r.IsArchived));

            if (hasActiveAllocations)
            {
                return BadRequest(new { message = "Cannot archive sub-category while allocated assets are assigned to a room using it." });
            }

            sub.IsArchived = true;
            sub.UpdatedAt = DateTime.UtcNow;
            sub.UpdatedBy = userId;

            _auditService.Add(HttpContext, new AuditLog
            {
                Action = "Archive",
                EntityType = "RoomSubCategory",
                EntityId = id,
                Module = "Configuration",
                UserId = userId,
                TenantId = tenantId,
                NewValues = JsonSerializer.Serialize(new { sub.Name, IsArchived = true }),
            });

            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpPatch("{id}/restore")]
        [RequirePermission("RoomCategories", "CanArchive")]
        public async Task<IActionResult> RestoreRoomSubCategory(string id)
        {
            var tenantId = GetCurrentTenantId();
            var userId = GetCurrentUserId();
            var sub = await _context.RoomSubCategories.FindAsync(id);

            if (sub == null) return NotFound();
            if (!IsSuperAdmin() && tenantId.HasValue && sub.TenantId != tenantId) return NotFound();

            var nameExists = await _context.RoomSubCategories.AnyAsync(s =>
                s.Id != id &&
                s.RoomCategoryId == sub.RoomCategoryId &&
                s.Name.ToLower() == sub.Name.ToLower() &&
                !s.IsArchived &&
                (IsSuperAdmin() ? s.TenantId == null : s.TenantId == tenantId));
            if (nameExists)
                return Conflict(new { message = "Cannot restore: this sub-category name already exists as an active record." });

            sub.IsArchived = false;
            sub.UpdatedAt = DateTime.UtcNow;
            sub.UpdatedBy = userId;

            _auditService.Add(HttpContext, new AuditLog
            {
                Action = "Restore",
                EntityType = "RoomSubCategory",
                EntityId = id,
                Module = "Configuration",
                UserId = userId,
                TenantId = tenantId,
                NewValues = JsonSerializer.Serialize(new { sub.Name, IsArchived = false }),
            });

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                return Conflict(new { message = "Cannot restore: this sub-category name already exists as an active record." });
            }

            return NoContent();
        }
    }
}
