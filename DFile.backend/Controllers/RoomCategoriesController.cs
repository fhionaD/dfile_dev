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
using Microsoft.Extensions.Logging;

namespace DFile.backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class RoomCategoriesController : TenantAwareController
    {
        private readonly AppDbContext _context;
        private readonly IAuditService _auditService;
        private readonly ILogger<RoomCategoriesController> _logger;

        public RoomCategoriesController(AppDbContext context, IAuditService auditService, ILogger<RoomCategoriesController> logger)
        {
            _context = context;
            _auditService = auditService;
            _logger = logger;
        }

        private int? GetCurrentUserId()
        {
            var claim = User.FindFirst("UserId")?.Value ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(claim)) return null;
            return int.TryParse(claim, out var id) ? id : null;
        }

        private static bool IsUniqueConstraintViolation(DbUpdateException ex)
        {
            if (ex.InnerException is SqlException sqlEx)
            {
                return sqlEx.Number == 2601 || sqlEx.Number == 2627;
            }

            return false;
        }

        /// <summary>
        /// Rooms that count as "using" this category for display and archive rules.
        /// Tenant-scoped categories only count same-tenant rooms so stray cross-tenant FK rows do not block archive.
        /// </summary>
        private static IQueryable<Room> ActiveRoomsForCategory(AppDbContext ctx, RoomCategory category, int? viewerTenantId, bool superAdmin)
        {
            var q = ctx.Rooms.Where(r => r.CategoryId == category.Id && !r.IsArchived);
            if (category.TenantId.HasValue)
                return q.Where(r => r.TenantId == category.TenantId.Value);
            if (!superAdmin && viewerTenantId.HasValue)
                return q.Where(r => r.TenantId == viewerTenantId.Value);
            return q;
        }

        private static IQueryable<RoomSubCategory> ActiveSubCategoriesForCategory(
            AppDbContext ctx, RoomCategory category, int? viewerTenantId, bool superAdmin)
        {
            var q = ctx.RoomSubCategories.Where(s => s.RoomCategoryId == category.Id && !s.IsArchived);
            if (category.TenantId.HasValue)
                return q.Where(s => s.TenantId == category.TenantId.Value);
            if (!superAdmin && viewerTenantId.HasValue)
                return q.Where(s => s.TenantId == viewerTenantId.Value);
            return q;
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

            var categoryIds = categories.Select(c => c.Id).ToList();
            var roomCounts = new Dictionary<string, int>();
            var subCatCounts = new Dictionary<string, int>();

            if (categoryIds.Count > 0)
            {
                var roomRows = await _context.Rooms
                    .Where(r => !r.IsArchived && r.CategoryId != null && categoryIds.Contains(r.CategoryId))
                    .Select(r => new { r.CategoryId, r.TenantId })
                    .ToListAsync();

                var subRows = await _context.RoomSubCategories
                    .Where(s => !s.IsArchived && categoryIds.Contains(s.RoomCategoryId))
                    .Select(s => new { s.RoomCategoryId, s.TenantId })
                    .ToListAsync();

                foreach (var c in categories)
                {
                    roomCounts[c.Id] = roomRows.Count(r =>
                        r.CategoryId == c.Id &&
                        (!c.TenantId.HasValue || r.TenantId == c.TenantId));
                    subCatCounts[c.Id] = subRows.Count(s =>
                        s.RoomCategoryId == c.Id &&
                        (!c.TenantId.HasValue || s.TenantId == c.TenantId));
                }
            }

            var result = categories.Select(c => new RoomCategoryResponseDto
            {
                Id = c.Id,
                RoomCategoryCode = c.RoomCategoryCode,
                Name = c.Name,
                Description = c.Description,
                IsArchived = c.IsArchived,
                TenantId = c.TenantId,
                RoomCount = roomCounts.GetValueOrDefault(c.Id),
                SubCategoryCount = subCatCounts.GetValueOrDefault(c.Id),
                CreatedByName = c.CreatedByUser != null ? c.CreatedByUser.FirstName + " " + c.CreatedByUser.LastName : null,
                UpdatedByName = c.UpdatedByUser != null ? c.UpdatedByUser.FirstName + " " + c.UpdatedByUser.LastName : null,
                CreatedAt = c.CreatedAt,
                UpdatedAt = c.UpdatedAt,
                RowVersion = c.RowVersion
            }).ToList();

            return Ok(result);
        }

        /// <summary>Active vs archived room category totals (tenant-scoped) for archive-view toggles.</summary>
        [HttpGet("counts")]
        [RequirePermission("RoomCategories", "CanView")]
        public async Task<ActionResult<object>> GetRoomCategoryCounts()
        {
            var tenantId = GetCurrentTenantId();
            var baseQuery = _context.RoomCategories.AsQueryable();
            if (!IsSuperAdmin() && tenantId.HasValue)
                baseQuery = baseQuery.Where(c => c.TenantId == tenantId);

            var active = await baseQuery.CountAsync(c => !c.IsArchived);
            var archived = await baseQuery.CountAsync(c => c.IsArchived);
            return Ok(new { active, archived });
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

            var roomCount = await ActiveRoomsForCategory(_context, category, tenantId, IsSuperAdmin()).CountAsync();

            var subCategoryCount = await ActiveSubCategoriesForCategory(_context, category, tenantId, IsSuperAdmin())
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
            const string notFoundMessage = "Room category not found.";
            const string conflictTitle = "Unable to Archive Category";
            const string roomUnitsConflictMessage =
                "This room category is currently assigned to one or more room units. Please update or remove those room units before archiving this category.";
            const string unexpectedMessage = "An unexpected error occurred while archiving the room category.";

            try
            {
                var tenantId = GetCurrentTenantId();
                var userId = GetCurrentUserId();
                var category = await _context.RoomCategories.FindAsync(id);

                if (category == null)
                    return NotFound(new { message = notFoundMessage });

                if (!IsSuperAdmin() && tenantId.HasValue && category.TenantId != tenantId)
                    return NotFound(new { message = notFoundMessage });

                if (category.IsArchived)
                {
                    return Ok(new
                    {
                        message = "Room category archived successfully.",
                        cascadedRoomCount = 0,
                        cascadedSubCategoryCount = 0,
                    });
                }

                var activeRoomsExist = await ActiveRoomsForCategory(_context, category, tenantId, IsSuperAdmin())
                    .AnyAsync();

                if (activeRoomsExist)
                {
                    return Conflict(new
                    {
                        title = conflictTitle,
                        message = roomUnitsConflictMessage,
                    });
                }

                // Use EXISTS-style correlation so EF/SQL Server always translates (some Join shapes throw at runtime).
                var categoryId = category.Id;
                var hasActiveAllocations = await _context.AssetAllocations
                    .AsNoTracking()
                    .Where(a => a.Status == "Active")
                    .AnyAsync(a =>
                        _context.Rooms.AsNoTracking().Any(r =>
                            r.Id == a.RoomId && r.CategoryId == categoryId));

                if (hasActiveAllocations)
                {
                    return BadRequest(new { message = "Cannot archive room category with allocated assets." });
                }

                var now = DateTime.UtcNow;
                var userIdStr = userId?.ToString();

                await using var transaction = await _context.Database.BeginTransactionAsync();

                try
                {
                    var activeSubs = await ActiveSubCategoriesForCategory(_context, category, tenantId, IsSuperAdmin())
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
                        NewValues = JsonSerializer.Serialize(new { category.Name, IsArchived = true, CascadedSubCategories = activeSubs.Count }),
                    });

                    await _context.SaveChangesAsync();
                    await transaction.CommitAsync();

                    return Ok(new
                    {
                        message = "Room category archived successfully.",
                        cascadedRoomCount = 0,
                        cascadedSubCategoryCount = activeSubs.Count,
                    });
                }
                catch (Exception inner)
                {
                    try
                    {
                        await transaction.RollbackAsync();
                    }
                    catch (Exception rollbackEx)
                    {
                        _logger.LogWarning(rollbackEx, "Rollback failed after archive error for category {CategoryId}", id);
                    }

                    if (inner is DbUpdateException dbEx)
                    {
                        _logger.LogWarning(dbEx, "DbUpdateException archiving room category {CategoryId}", id);
                        return Conflict(new
                        {
                            title = conflictTitle,
                            message = "Could not archive this room category. Try again or contact support if the problem persists.",
                        });
                    }

                    if (inner is DbUpdateConcurrencyException cex)
                    {
                        _logger.LogWarning(cex, "Concurrency conflict archiving room category {CategoryId}", id);
                        return Conflict(new
                        {
                            title = conflictTitle,
                            message = "This category was modified by another user. Please refresh and try again.",
                        });
                    }

                    _logger.LogError(inner, "Unexpected error in archive transaction for room category {CategoryId}", id);
                    return StatusCode(StatusCodes.Status500InternalServerError, new { message = unexpectedMessage });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "ArchiveRoomCategory failed for category {CategoryId}", id);
                return StatusCode(StatusCodes.Status500InternalServerError, new { message = unexpectedMessage });
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
