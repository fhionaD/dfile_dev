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
    public class RoomCategoriesController : TenantAwareController
    {
        private readonly AppDbContext _context;

        public RoomCategoriesController(AppDbContext context)
        {
            _context = context;
        }

        private int? GetCurrentUserId()
        {
            var claim = User.FindFirst("UserId")?.Value ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            return string.IsNullOrEmpty(claim) ? null : int.Parse(claim);
        }

        [HttpGet]
        [RequirePermission("RoomCategories", "CanView")]
        public async Task<ActionResult<IEnumerable<RoomCategoryResponseDto>>> GetRoomCategories(
            [FromQuery] bool showArchived = false,
            [FromQuery] string? search = null)
        {
            var tenantId = GetCurrentTenantId();

            var query = _context.RoomCategories
                .Include(c => c.CreatedByUser)
                .Include(c => c.UpdatedByUser)
                .Where(c => c.IsArchived == showArchived);

            if (!IsSuperAdmin() && tenantId.HasValue)
            {
                query = query.Where(c => c.TenantId == tenantId);
            }

            if (!string.IsNullOrEmpty(search))
            {
                search = search.ToLower();
                query = query.Where(c =>
                    c.Name.ToLower().Contains(search) ||
                    c.SubCategory.ToLower().Contains(search) ||
                    (c.Description != null && c.Description.ToLower().Contains(search)));
            }

            var categories = await query.ToListAsync();

            // Get room counts per category
            var roomCountsQuery = _context.Rooms.Where(r => !r.IsArchived).AsQueryable();
            if (!IsSuperAdmin() && tenantId.HasValue)
            {
                roomCountsQuery = roomCountsQuery.Where(r => r.TenantId == tenantId);
            }

            var roomCounts = await roomCountsQuery
                .Where(r => r.CategoryId != null)
                .GroupBy(r => r.CategoryId!)
                .Select(g => new { CategoryId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.CategoryId, x => x.Count);

            var result = categories.Select(c => new RoomCategoryResponseDto
            {
                Id = c.Id,
                RoomCategoryCode = c.RoomCategoryCode,
                Name = c.Name,
                SubCategory = c.SubCategory,
                Description = c.Description,
                IsArchived = c.IsArchived,
                TenantId = c.TenantId,
                RoomCount = roomCounts.TryGetValue(c.Id, out var count) ? count : 0,
                CreatedByName = c.CreatedByUser != null ? c.CreatedByUser.FirstName + " " + c.CreatedByUser.LastName : null,
                UpdatedByName = c.UpdatedByUser != null ? c.UpdatedByUser.FirstName + " " + c.UpdatedByUser.LastName : null,
                CreatedAt = c.CreatedAt,
                UpdatedAt = c.UpdatedAt,
                RowVersion = c.RowVersion
            }).ToList();

            return Ok(result);
        }

        [HttpGet("{id}")]
        [RequirePermission("RoomCategories", "CanView")]
        public async Task<ActionResult<RoomCategoryResponseDto>> GetRoomCategory(string id)
        {
            var tenantId = GetCurrentTenantId();
            var category = await _context.RoomCategories
                .Include(c => c.CreatedByUser)
                .Include(c => c.UpdatedByUser)
                .FirstOrDefaultAsync(c => c.Id == id);

            if (category == null) return NotFound();
            if (!IsSuperAdmin() && tenantId.HasValue && category.TenantId != tenantId) return NotFound();

            var roomCount = await _context.Rooms
                .Where(r => r.CategoryId == id && !r.IsArchived)
                .Where(r => IsSuperAdmin() || !tenantId.HasValue || r.TenantId == tenantId)
                .CountAsync();

            return Ok(new RoomCategoryResponseDto
            {
                Id = category.Id,
                RoomCategoryCode = category.RoomCategoryCode,
                Name = category.Name,
                SubCategory = category.SubCategory,
                Description = category.Description,
                IsArchived = category.IsArchived,
                TenantId = category.TenantId,
                RoomCount = roomCount,
                CreatedByName = category.CreatedByUser != null ? category.CreatedByUser.FirstName + " " + category.CreatedByUser.LastName : null,
                UpdatedByName = category.UpdatedByUser != null ? category.UpdatedByUser.FirstName + " " + category.UpdatedByUser.LastName : null,
                CreatedAt = category.CreatedAt,
                UpdatedAt = category.UpdatedAt,
                RowVersion = category.RowVersion
            });
        }

        [HttpPost]
        [RequirePermission("RoomCategories", "CanCreate")]
        public async Task<ActionResult<RoomCategoryResponseDto>> PostRoomCategory(CreateRoomCategoryDto dto)
        {
            var tenantId = GetCurrentTenantId();
            var userId = GetCurrentUserId();

            var trimmedName = dto.Name?.Trim() ?? string.Empty;
            var trimmedSub = dto.SubCategory?.Trim() ?? string.Empty;

            if (string.IsNullOrWhiteSpace(trimmedName) || string.IsNullOrWhiteSpace(trimmedSub))
                return BadRequest(new { message = "Category name and sub-category are required." });

            var nameLower = trimmedName.ToLower();
            var subLower = trimmedSub.ToLower();

            var nameExists = await _context.RoomCategories.AnyAsync(c =>
                c.Name.ToLower() == nameLower &&
                c.SubCategory.ToLower() == subLower &&
                !c.IsArchived &&
                (IsSuperAdmin() ? c.TenantId == null : c.TenantId == tenantId));
            if (nameExists)
                return Conflict(new { message = "This category name and sub-category combination already exists." });

            var category = new RoomCategory
            {
                Id = await RecordCodeGenerator.GenerateRoomCategoryIdAsync(_context),
                RoomCategoryCode = await RecordCodeGenerator.GenerateRoomCategoryCodeAsync(_context),
                Name = trimmedName,
                SubCategory = trimmedSub,
                Description = dto.Description?.Trim() ?? string.Empty,
                IsArchived = false,
                TenantId = IsSuperAdmin() ? null : tenantId,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                CreatedBy = userId,
                UpdatedBy = userId
            };

            _context.RoomCategories.Add(category);

            _context.AuditLogs.Add(new AuditLog
            {
                Action = "Create",
                EntityType = "RoomCategory",
                EntityId = category.Id,
                Module = "Configuration",
                UserId = userId,
                TenantId = tenantId,
                NewValues = JsonSerializer.Serialize(new { category.Name, category.SubCategory, category.Description }),
                IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
                UserAgent = Request.Headers.UserAgent.ToString()
            });

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                return Conflict(new { message = "This category name and sub-category combination already exists." });
            }

            return CreatedAtAction("GetRoomCategory", new { id = category.Id }, new RoomCategoryResponseDto
            {
                Id = category.Id,
                RoomCategoryCode = category.RoomCategoryCode,
                Name = category.Name,
                SubCategory = category.SubCategory,
                Description = category.Description,
                IsArchived = category.IsArchived,
                TenantId = category.TenantId,
                RoomCount = 0,
                CreatedAt = category.CreatedAt,
                UpdatedAt = category.UpdatedAt,
                RowVersion = category.RowVersion
            });
        }

        [HttpPut("{id}")]
        [RequirePermission("RoomCategories", "CanEdit")]
        public async Task<IActionResult> PutRoomCategory(string id, UpdateRoomCategoryDto dto)
        {
            var tenantId = GetCurrentTenantId();
            var userId = GetCurrentUserId();
            var existing = await _context.RoomCategories.FindAsync(id);

            if (existing == null) return NotFound();
            if (!IsSuperAdmin() && tenantId.HasValue && existing.TenantId != tenantId) return NotFound();

            var trimmedName = dto.Name?.Trim() ?? string.Empty;
            var trimmedSub = dto.SubCategory?.Trim() ?? string.Empty;

            if (string.IsNullOrWhiteSpace(trimmedName) || string.IsNullOrWhiteSpace(trimmedSub))
                return BadRequest(new { message = "Category name and sub-category are required." });

            if (existing.Name.ToLower() != trimmedName.ToLower() || existing.SubCategory.ToLower() != trimmedSub.ToLower())
            {
                var nameLower = trimmedName.ToLower();
                var subLower = trimmedSub.ToLower();

                var nameExists = await _context.RoomCategories.AnyAsync(c =>
                    c.Id != id &&
                    c.Name.ToLower() == nameLower &&
                    c.SubCategory.ToLower() == subLower &&
                    !c.IsArchived &&
                    (IsSuperAdmin() ? c.TenantId == null : c.TenantId == tenantId));
                if (nameExists)
                    return Conflict(new { message = "This category name and sub-category combination already exists." });
            }

            if (dto.RowVersion != null)
            {
                _context.Entry(existing).Property(p => p.RowVersion).OriginalValue = dto.RowVersion;
            }

            var oldValues = JsonSerializer.Serialize(new { existing.Name, existing.SubCategory, existing.Description });

            existing.Name = trimmedName;
            existing.SubCategory = trimmedSub;
            existing.Description = dto.Description?.Trim() ?? string.Empty;
            existing.UpdatedAt = DateTime.UtcNow;
            existing.UpdatedBy = userId;

            _context.AuditLogs.Add(new AuditLog
            {
                Action = "Update",
                EntityType = "RoomCategory",
                EntityId = id,
                Module = "Configuration",
                UserId = userId,
                TenantId = tenantId,
                OldValues = oldValues,
                NewValues = JsonSerializer.Serialize(new { Name = trimmedName, SubCategory = trimmedSub, Description = existing.Description }),
                IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
                UserAgent = Request.Headers.UserAgent.ToString()
            });

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                return Conflict(new { message = "This record was modified by another user. Please refresh and try again." });
            }
            catch (DbUpdateException)
            {
                return Conflict(new { message = "This category name and sub-category combination already exists." });
            }

            return NoContent();
        }

        [HttpPatch("{id}/archive")]
        [RequirePermission("RoomCategories", "CanArchive")]
        public async Task<IActionResult> ArchiveRoomCategory(string id)
        {
            var tenantId = GetCurrentTenantId();
            var userId = GetCurrentUserId();
            var category = await _context.RoomCategories.FindAsync(id);

            if (category == null) return NotFound();
            if (!IsSuperAdmin() && tenantId.HasValue && category.TenantId != tenantId) return NotFound();

            // Prevent archiving if active room units are assigned
            var activeRoomCount = await _context.Rooms
                .Where(r => r.CategoryId == id && !r.IsArchived)
                .Where(r => IsSuperAdmin() || !tenantId.HasValue || r.TenantId == tenantId)
                .CountAsync();

            if (activeRoomCount > 0)
                return Conflict(new { message = "This room category cannot be archived because active room units are assigned to it." });

            category.IsArchived = true;
            category.ArchivedAt = DateTime.UtcNow;
            category.ArchivedBy = userId?.ToString();
            category.UpdatedAt = DateTime.UtcNow;
            category.UpdatedBy = userId;

            _context.AuditLogs.Add(new AuditLog
            {
                Action = "Archive",
                EntityType = "RoomCategory",
                EntityId = id,
                Module = "Configuration",
                UserId = userId,
                TenantId = tenantId,
                NewValues = JsonSerializer.Serialize(new { category.Name, category.SubCategory, IsArchived = true }),
                IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
                UserAgent = Request.Headers.UserAgent.ToString()
            });

            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpPatch("{id}/restore")]
        [RequirePermission("RoomCategories", "CanArchive")]
        public async Task<IActionResult> RestoreRoomCategory(string id)
        {
            var tenantId = GetCurrentTenantId();
            var userId = GetCurrentUserId();
            var category = await _context.RoomCategories.FindAsync(id);

            if (category == null) return NotFound();
            if (!IsSuperAdmin() && tenantId.HasValue && category.TenantId != tenantId) return NotFound();

            var nameExists = await _context.RoomCategories.AnyAsync(c =>
                c.Id != id &&
                c.Name.ToLower() == category.Name.ToLower() &&
                c.SubCategory.ToLower() == category.SubCategory.ToLower() &&
                !c.IsArchived &&
                (IsSuperAdmin() ? c.TenantId == null : c.TenantId == tenantId));
            if (nameExists)
                return Conflict(new { message = "Cannot restore: this category name and sub-category combination already exists as an active record." });

            category.IsArchived = false;
            category.ArchivedAt = null;
            category.ArchivedBy = null;
            category.UpdatedAt = DateTime.UtcNow;
            category.UpdatedBy = userId;

            _context.AuditLogs.Add(new AuditLog
            {
                Action = "Restore",
                EntityType = "RoomCategory",
                EntityId = id,
                Module = "Configuration",
                UserId = userId,
                TenantId = tenantId,
                NewValues = JsonSerializer.Serialize(new { category.Name, category.SubCategory, IsArchived = false }),
                IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
                UserAgent = Request.Headers.UserAgent.ToString()
            });

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                return Conflict(new { message = "Cannot restore: this category name and sub-category combination already exists as an active record." });
            }

            return NoContent();
        }
    }
}
