using DFile.backend.Authorization;
using DFile.backend.Data;
using DFile.backend.DTOs;
using DFile.backend.Models;
using DFile.backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Data.SqlClient;
using System.Text.Json;

namespace DFile.backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class RoomCategoriesController : TenantAwareController
    {
        private readonly AppDbContext _context;
        private readonly IAuditService _auditService;

        public RoomCategoriesController(AppDbContext context, IAuditService auditService)
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

            // Get subcategory counts per category
            var subCatCountsQuery = _context.RoomSubCategories.Where(s => !s.IsArchived).AsQueryable();
            if (!IsSuperAdmin() && tenantId.HasValue)
            {
                subCatCountsQuery = subCatCountsQuery.Where(s => s.TenantId == tenantId);
            }

            var subCatCounts = await subCatCountsQuery
                .GroupBy(s => s.RoomCategoryId)
                .Select(g => new { CategoryId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.CategoryId, x => x.Count);

            var result = categories.Select(c => new RoomCategoryResponseDto
            {
                Id = c.Id,
                RoomCategoryCode = c.RoomCategoryCode,
                Name = c.Name,
                Description = c.Description,
                IsArchived = c.IsArchived,
                TenantId = c.TenantId,
                RoomCount = roomCounts.TryGetValue(c.Id, out var count) ? count : 0,
                SubCategoryCount = subCatCounts.TryGetValue(c.Id, out var subCount) ? subCount : 0,
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

            var subCategoryCount = await _context.RoomSubCategories
                .Where(s => s.RoomCategoryId == id && !s.IsArchived)
                .CountAsync();

            return Ok(new RoomCategoryResponseDto
            {
                Id = category.Id,
                RoomCategoryCode = category.RoomCategoryCode,
                Name = category.Name,
                Description = category.Description,
                IsArchived = category.IsArchived,
                TenantId = category.TenantId,
                RoomCount = roomCount,
                SubCategoryCount = subCategoryCount,
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

            if (string.IsNullOrWhiteSpace(trimmedName))
                return BadRequest(new { message = "Category name is required." });

            var nameLower = trimmedName.ToLower();

            var nameExists = await _context.RoomCategories.AnyAsync(c =>
                c.Name.ToLower() == nameLower &&
                !c.IsArchived &&
                (IsSuperAdmin() ? c.TenantId == null : c.TenantId == tenantId));
            if (nameExists)
                return Conflict(new { message = "This category name already exists." });

            var category = new RoomCategory
            {
                Id = await RecordCodeGenerator.GenerateRoomCategoryIdAsync(_context),
                RoomCategoryCode = await RecordCodeGenerator.GenerateRoomCategoryCodeAsync(_context),
                Name = trimmedName,
                SubCategory = string.Empty,
                Description = dto.Description?.Trim() ?? string.Empty,
                IsArchived = false,
                TenantId = IsSuperAdmin() ? null : tenantId,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                CreatedBy = userId,
                UpdatedBy = userId
            };

            _context.RoomCategories.Add(category);

            _auditService.Add(HttpContext, new AuditLog
            {
                Action = "Create",
                EntityType = "RoomCategory",
                EntityId = category.Id,
                Module = "Configuration",
                UserId = userId,
                TenantId = tenantId,
                NewValues = JsonSerializer.Serialize(new { category.Name, category.Description }),
            });

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException ex) when (IsUniqueConstraintViolation(ex))
            {
                return Conflict(new { message = "This category name already exists." });
            }

            return CreatedAtAction("GetRoomCategory", new { id = category.Id }, new RoomCategoryResponseDto
            {
                Id = category.Id,
                RoomCategoryCode = category.RoomCategoryCode,
                Name = category.Name,
                Description = category.Description,
                IsArchived = category.IsArchived,
                TenantId = category.TenantId,
                RoomCount = 0,
                SubCategoryCount = 0,
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

            if (string.IsNullOrWhiteSpace(trimmedName))
                return BadRequest(new { message = "Category name is required." });

            if (existing.Name.ToLower() != trimmedName.ToLower())
            {
                var nameLower = trimmedName.ToLower();

                var nameExists = await _context.RoomCategories.AnyAsync(c =>
                    c.Id != id &&
                    c.Name.ToLower() == nameLower &&
                    !c.IsArchived &&
                    (IsSuperAdmin() ? c.TenantId == null : c.TenantId == tenantId));
                if (nameExists)
                    return Conflict(new { message = "This category name already exists." });
            }

            if (dto.RowVersion != null)
            {
                _context.Entry(existing).Property(p => p.RowVersion).OriginalValue = dto.RowVersion;
            }

            var oldValues = JsonSerializer.Serialize(new { existing.Name, existing.Description });

            existing.Name = trimmedName;
            existing.SubCategory = existing.SubCategory ?? string.Empty;
            existing.Description = dto.Description?.Trim() ?? string.Empty;
            existing.UpdatedAt = DateTime.UtcNow;
            existing.UpdatedBy = userId;

            _auditService.Add(HttpContext, new AuditLog
            {
                Action = "Update",
                EntityType = "RoomCategory",
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
                return Conflict(new { message = "This category name already exists." });
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

            var now = DateTime.UtcNow;
            var userIdStr = userId?.ToString();

            await using var transaction = await _context.Database.BeginTransactionAsync();

            try
            {
                // Cascade-archive any active room units assigned to this category (no 409 — rooms are archived with the category)
                var activeRooms = await _context.Rooms
                    .Where(r => r.CategoryId == id && !r.IsArchived)
                    .Where(r => IsSuperAdmin() || !tenantId.HasValue || r.TenantId == tenantId)
                    .ToListAsync();

                foreach (var room in activeRooms)
                {
                    room.IsArchived = true;
                    room.ArchivedAt = now;
                    room.ArchivedBy = userIdStr;
                    room.UpdatedAt = now;
                    room.UpdatedBy = userId;

                    _auditService.Add(HttpContext, new AuditLog
                    {
                        Action = "Archive",
                        EntityType = "Room",
                        EntityId = room.Id,
                        Module = "Configuration",
                        UserId = userId,
                        TenantId = tenantId,
                        NewValues = JsonSerializer.Serialize(new { room.Name, IsArchived = true, Reason = "Cascade from category archive" }),
                    });
                }

                var activeSubs = await _context.RoomSubCategories
                    .Where(s => s.RoomCategoryId == id && !s.IsArchived)
                    .Where(s => IsSuperAdmin() || !tenantId.HasValue || s.TenantId == tenantId)
                    .ToListAsync();

                foreach (var sub in activeSubs)
                {
                    sub.IsArchived = true;
                    sub.UpdatedAt = now;
                    sub.UpdatedBy = userId;

                    _auditService.Add(HttpContext, new AuditLog
                    {
                        Action = "Archive",
                        EntityType = "RoomSubCategory",
                        EntityId = sub.Id,
                        Module = "Configuration",
                        UserId = userId,
                        TenantId = tenantId,
                        NewValues = JsonSerializer.Serialize(new { sub.Name, IsArchived = true, Reason = "Cascade from category archive" }),
                    });
                }

                category.IsArchived = true;
                category.ArchivedAt = now;
                category.ArchivedBy = userIdStr;
                category.UpdatedAt = now;
                category.UpdatedBy = userId;

                _auditService.Add(HttpContext, new AuditLog
                {
                    Action = "Archive",
                    EntityType = "RoomCategory",
                    EntityId = id,
                    Module = "Configuration",
                    UserId = userId,
                    TenantId = tenantId,
                    NewValues = JsonSerializer.Serialize(new { category.Name, IsArchived = true, CascadedRooms = activeRooms.Count, CascadedSubCategories = activeSubs.Count }),
                });

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                // 200 + body (not 204) so clients can confirm the new API build; old builds returned 409 Conflict here.
                return Ok(new
                {
                    message = "Room category archived successfully.",
                    cascadedRoomCount = activeRooms.Count,
                    cascadedSubCategoryCount = activeSubs.Count,
                });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                if (ex is DbUpdateException)
                {
                    return Conflict(new { message = "Could not archive this room category. Try again or contact support if the problem persists." });
                }

                throw;
            }
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
                !c.IsArchived &&
                (IsSuperAdmin() ? c.TenantId == null : c.TenantId == tenantId));
            if (nameExists)
                return Conflict(new { message = "Cannot restore: this category name already exists as an active record." });

            category.IsArchived = false;
            category.ArchivedAt = null;
            category.ArchivedBy = null;
            category.UpdatedAt = DateTime.UtcNow;
            category.UpdatedBy = userId;

            _auditService.Add(HttpContext, new AuditLog
            {
                Action = "Restore",
                EntityType = "RoomCategory",
                EntityId = id,
                Module = "Configuration",
                UserId = userId,
                TenantId = tenantId,
                NewValues = JsonSerializer.Serialize(new { category.Name, IsArchived = false }),
            });

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                return Conflict(new { message = "Cannot restore: this category name already exists as an active record." });
            }

            return NoContent();
        }
    }
}
