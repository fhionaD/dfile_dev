using DFile.backend.Authorization;
using DFile.backend.Data;
using DFile.backend.DTOs;
using DFile.backend.Models;
using DFile.backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace DFile.backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class AssetCategoriesController : TenantAwareController
    {
        private readonly AppDbContext _context;
        private readonly IAuditService _auditService;
        private readonly PermissionService _permissionService;

        public AssetCategoriesController(AppDbContext context, IAuditService auditService, PermissionService permissionService)
        {
            _context = context;
            _auditService = auditService;
            _permissionService = permissionService;
        }

        private int? GetCurrentUserId()
        {
            var claim = User.FindFirst("UserId")?.Value ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            return string.IsNullOrEmpty(claim) ? null : int.Parse(claim);
        }

        private static readonly string[] StatusLabels = { "", "Available", "In Use", "Maintenance", "Disposed" };

        [HttpGet]
        public async Task<ActionResult<IEnumerable<AssetCategoryResponseDto>>> GetAssetCategories([FromQuery] bool showArchived = false)
        {
            var tenantId = GetCurrentTenantId();
            var userId = GetCurrentUserId();

            if (!IsSuperAdmin())
            {
                if (!tenantId.HasValue || !userId.HasValue) return Forbid();
                var canAssetCategories = await _permissionService.HasPermission(userId.Value, tenantId.Value, "AssetCategories", "CanView");
                var canAssets = await _permissionService.HasPermission(userId.Value, tenantId.Value, "Assets", "CanView");
                var isMaintenanceRole = User.IsInRole("Maintenance");
                if (!canAssetCategories && !canAssets && !isMaintenanceRole)
                    return StatusCode(403, new { message = "You do not have permission to view asset categories." });
            }

            var categoriesQuery = _context.AssetCategories
                .Include(c => c.CreatedByUser)
                .Include(c => c.UpdatedByUser)
                .Where(c => c.IsArchived == showArchived);

            if (!IsSuperAdmin() && tenantId.HasValue)
            {
                categoriesQuery = categoriesQuery.Where(c => c.TenantId == null || c.TenantId == tenantId);
            }

            var categories = await categoriesQuery.ToListAsync();

            var assetCountsQuery = _context.Assets.Where(a => !a.IsArchived).AsQueryable();
            if (!IsSuperAdmin() && tenantId.HasValue)
            {
                assetCountsQuery = assetCountsQuery.Where(a => a.TenantId == tenantId);
            }

            var assetCounts = await assetCountsQuery
                .GroupBy(a => a.CategoryId!)
                .Select(g => new { CategoryId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.CategoryId, x => x.Count);

            var result = categories.Select(c => new AssetCategoryResponseDto
            {
                Id = c.Id,
                AssetCategoryCode = c.AssetCategoryCode,
                CategoryName = c.CategoryName,
                HandlingType = c.HandlingType,
                Description = c.Description,
                SalvagePercentage = c.SalvagePercentage,
                IsArchived = c.IsArchived,
                TenantId = c.TenantId,
                AssetCount = assetCounts.TryGetValue(c.Id, out var count) ? count : 0,
                CreatedByName = c.CreatedByUser != null ? c.CreatedByUser.FirstName + " " + c.CreatedByUser.LastName : null,
                UpdatedByName = c.UpdatedByUser != null ? c.UpdatedByUser.FirstName + " " + c.UpdatedByUser.LastName : null,
                CreatedAt = c.CreatedAt,
                UpdatedAt = c.UpdatedAt,
                RowVersion = c.RowVersion
            }).ToList();

            return Ok(result);
        }

        [HttpGet("{id}")]
        [RequirePermission("AssetCategories", "CanView")]
        public async Task<ActionResult<AssetCategoryResponseDto>> GetAssetCategory(string id)
        {
            var tenantId = GetCurrentTenantId();
            var category = await _context.AssetCategories
                .Include(c => c.CreatedByUser)
                .Include(c => c.UpdatedByUser)
                .FirstOrDefaultAsync(c => c.Id == id);

            if (category == null) return NotFound();
            if (!IsSuperAdmin() && tenantId.HasValue && category.TenantId != null && category.TenantId != tenantId)
                return NotFound();

            var itemCount = await _context.Assets
                .Where(a => a.CategoryId == id && !a.IsArchived)
                .Where(a => IsSuperAdmin() || !tenantId.HasValue || a.TenantId == tenantId)
                .CountAsync();

            return Ok(new AssetCategoryResponseDto
            {
                Id = category.Id,
                AssetCategoryCode = category.AssetCategoryCode,
                CategoryName = category.CategoryName,
                HandlingType = category.HandlingType,
                Description = category.Description,
                SalvagePercentage = category.SalvagePercentage,
                IsArchived = category.IsArchived,
                TenantId = category.TenantId,
                AssetCount = itemCount,
                CreatedByName = category.CreatedByUser != null ? category.CreatedByUser.FirstName + " " + category.CreatedByUser.LastName : null,
                UpdatedByName = category.UpdatedByUser != null ? category.UpdatedByUser.FirstName + " " + category.UpdatedByUser.LastName : null,
                CreatedAt = category.CreatedAt,
                UpdatedAt = category.UpdatedAt,
                RowVersion = category.RowVersion
            });
        }

        [HttpGet("options")]
        [RequirePermission("Assets", "CanView")]
        public async Task<ActionResult> GetAssetCategoryOptions()
        {
            var tenantId = GetCurrentTenantId();
            var query = _context.AssetCategories
                .Where(c => !c.IsArchived);

            if (!IsSuperAdmin() && tenantId.HasValue)
                query = query.Where(c => c.TenantId == null || c.TenantId == tenantId);

            var options = await query
                .OrderBy(c => c.CategoryName).ThenBy(c => c.HandlingType)
                .Select(c => new
                {
                    c.Id,
                    c.CategoryName,
                    HandlingType = c.HandlingType.ToString(),
                    DisplayName = c.CategoryName + " - " + c.HandlingType.ToString(),
                    c.SalvagePercentage
                })
                .ToListAsync();

            return Ok(options);
        }

        [HttpPost]
        [RequirePermission("AssetCategories", "CanCreate")]
        public async Task<ActionResult<AssetCategoryResponseDto>> PostAssetCategory(CreateAssetCategoryDto dto)
        {
            var tenantId = GetCurrentTenantId();
            var userId = GetCurrentUserId();

            // Validate uniqueness of CategoryName + HandlingType within scope
            var duplicateExists = await _context.AssetCategories.AnyAsync(c =>
                c.CategoryName == dto.CategoryName && c.HandlingType == dto.HandlingType && !c.IsArchived &&
                (IsSuperAdmin() ? c.TenantId == null : (c.TenantId == null || c.TenantId == tenantId)));
            if (duplicateExists)
                return Conflict(new { message = "A category with the same name and handling type already exists." });

            var category = new AssetCategory
            {
                Id = Guid.NewGuid().ToString(),
                AssetCategoryCode = await RecordCodeGenerator.GenerateCategoryCodeAsync(_context),
                CategoryName = dto.CategoryName,
                HandlingType = dto.HandlingType,
                Description = dto.Description,
                SalvagePercentage = dto.SalvagePercentage,
                IsArchived = false,
                TenantId = IsSuperAdmin() ? null : tenantId,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                CreatedBy = userId,
                UpdatedBy = userId
            };

            _context.AssetCategories.Add(category);

            _auditService.Add(HttpContext, new AuditLog
            {
                Action = "Create",
                EntityType = "AssetCategory",
                EntityId = category.Id,
                Module = "Configuration",
                UserId = userId,
                TenantId = tenantId,
                NewValues = JsonSerializer.Serialize(new { category.CategoryName, HandlingType = category.HandlingType.ToString(), category.Description }),
            });

            await _context.SaveChangesAsync();

            return CreatedAtAction("GetAssetCategory", new { id = category.Id }, new AssetCategoryResponseDto
            {
                Id = category.Id,
                AssetCategoryCode = category.AssetCategoryCode,
                CategoryName = category.CategoryName,
                HandlingType = category.HandlingType,
                Description = category.Description,
                SalvagePercentage = category.SalvagePercentage,
                IsArchived = category.IsArchived,
                TenantId = category.TenantId,
                AssetCount = 0,
                CreatedAt = category.CreatedAt,
                UpdatedAt = category.UpdatedAt,
                RowVersion = category.RowVersion
            });
        }

        [HttpPut("{id}")]
        [RequirePermission("AssetCategories", "CanEdit")]
        public async Task<IActionResult> PutAssetCategory(string id, UpdateAssetCategoryDto dto)
        {
            var tenantId = GetCurrentTenantId();
            var userId = GetCurrentUserId();
            var existing = await _context.AssetCategories.FindAsync(id);

            if (existing == null) return NotFound();
            if (!IsSuperAdmin() && tenantId.HasValue && existing.TenantId != null && existing.TenantId != tenantId)
                return NotFound();

            // Check uniqueness if name or handling type changed
            if (existing.CategoryName != dto.CategoryName || existing.HandlingType != dto.HandlingType)
            {
                var duplicateExists = await _context.AssetCategories.AnyAsync(c =>
                    c.Id != id && c.CategoryName == dto.CategoryName && c.HandlingType == dto.HandlingType && !c.IsArchived &&
                    (IsSuperAdmin() ? c.TenantId == null : (c.TenantId == null || c.TenantId == tenantId)));
                if (duplicateExists)
                    return Conflict(new { message = "A category with the same name and handling type already exists." });
            }

            // Block HandlingType change if category has linked assets
            if (existing.HandlingType != dto.HandlingType)
            {
                var linkedAssetCount = await _context.Assets.CountAsync(a => a.CategoryId == id && !a.IsArchived);
                if (linkedAssetCount > 0)
                    return BadRequest(new { message = $"Cannot change handling type: {linkedAssetCount} active asset(s) are linked to this category." });
            }

            // Concurrency check
            if (dto.RowVersion != null)
            {
                _context.Entry(existing).Property(p => p.RowVersion).OriginalValue = dto.RowVersion;
            }

            var oldValues = JsonSerializer.Serialize(new { existing.CategoryName, HandlingType = existing.HandlingType.ToString(), existing.Description, existing.SalvagePercentage });

            existing.CategoryName = dto.CategoryName;
            existing.HandlingType = dto.HandlingType;
            existing.Description = dto.Description;
            existing.SalvagePercentage = dto.SalvagePercentage;
            existing.UpdatedAt = DateTime.UtcNow;
            existing.UpdatedBy = userId;

            _auditService.Add(HttpContext, new AuditLog
            {
                Action = "Update",
                EntityType = "AssetCategory",
                EntityId = id,
                Module = "Configuration",
                UserId = userId,
                TenantId = tenantId,
                OldValues = oldValues,
                NewValues = JsonSerializer.Serialize(new { dto.CategoryName, HandlingType = dto.HandlingType.ToString(), dto.Description, dto.SalvagePercentage }),
            });

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                return Conflict(new { message = "This record was modified by another user. Please refresh and try again." });
            }

            return NoContent();
        }

        [HttpPut("archive/{id}")]
        [RequirePermission("AssetCategories", "CanArchive")]
        public async Task<IActionResult> ArchiveAssetCategory(string id)
        {
            var tenantId = GetCurrentTenantId();
            var userId = GetCurrentUserId();
            var category = await _context.AssetCategories.FindAsync(id);

            if (category == null) return NotFound();
            if (!IsSuperAdmin() && tenantId.HasValue && category.TenantId != null && category.TenantId != tenantId)
                return NotFound();

            var assetsInCategoryQuery = _context.Assets.Where(a => a.CategoryId == id && !a.IsArchived);
            if (!IsSuperAdmin() && tenantId.HasValue)
                assetsInCategoryQuery = assetsInCategoryQuery.Where(a => a.TenantId == tenantId);

            if (await assetsInCategoryQuery.AnyAsync())
                return BadRequest(new { message = "Cannot archive category with registered assets." });

            category.IsArchived = true;
            category.UpdatedAt = DateTime.UtcNow;
            category.UpdatedBy = userId;

            _auditService.Add(HttpContext, new AuditLog
            {
                Action = "Archive",
                EntityType = "AssetCategory",
                EntityId = id,
                Module = "Configuration",
                UserId = userId,
                TenantId = tenantId,
                NewValues = JsonSerializer.Serialize(new { category.CategoryName, IsArchived = true }),
            });

            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpPut("restore/{id}")]
        [RequirePermission("AssetCategories", "CanArchive")]
        public async Task<IActionResult> RestoreAssetCategory(string id)
        {
            var tenantId = GetCurrentTenantId();
            var userId = GetCurrentUserId();
            var category = await _context.AssetCategories.FindAsync(id);

            if (category == null) return NotFound();
            if (!IsSuperAdmin() && tenantId.HasValue && category.TenantId != null && category.TenantId != tenantId)
                return NotFound();

            // Check that restoring won't create a duplicate (Name + HandlingType)
            var duplicateExists = await _context.AssetCategories.AnyAsync(c =>
                c.Id != id && c.CategoryName == category.CategoryName && c.HandlingType == category.HandlingType && !c.IsArchived &&
                (IsSuperAdmin() ? c.TenantId == null : (c.TenantId == null || c.TenantId == tenantId)));
            if (duplicateExists)
                return Conflict(new { message = "Cannot restore: an active category with the same name and handling type already exists." });

            category.IsArchived = false;
            category.UpdatedAt = DateTime.UtcNow;
            category.UpdatedBy = userId;

            _auditService.Add(HttpContext, new AuditLog
            {
                Action = "Restore",
                EntityType = "AssetCategory",
                EntityId = id,
                Module = "Configuration",
                UserId = userId,
                TenantId = tenantId,
                NewValues = JsonSerializer.Serialize(new { category.CategoryName, IsArchived = false }),
            });

            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
