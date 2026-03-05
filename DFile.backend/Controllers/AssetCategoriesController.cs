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
    [Authorize(Roles = "Admin,Finance,Super Admin")]
    public class AssetCategoriesController : TenantAwareController
    {
        private readonly AppDbContext _context;

        public AssetCategoriesController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<AssetCategoryResponseDto>>> GetAssetCategories([FromQuery] bool showArchived = false)
        {
            var tenantId = GetCurrentTenantId();

            var categoriesQuery = _context.AssetCategories
                .Where(c => showArchived ? c.Status == "Archived" : c.Status != "Archived");

            if (!IsSuperAdmin() && tenantId.HasValue)
            {
                categoriesQuery = categoriesQuery.Where(c => c.TenantId == null || c.TenantId == tenantId);
            }

            var categories = await categoriesQuery.ToListAsync();

            var assetCountsQuery = _context.Assets.AsQueryable();
            if (!IsSuperAdmin() && tenantId.HasValue)
            {
                assetCountsQuery = assetCountsQuery.Where(a => a.TenantId == tenantId);
            }

            var assetCounts = await assetCountsQuery
                .Where(a => a.CategoryId != null)
                .GroupBy(a => a.CategoryId!)
                .Select(g => new { CategoryId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.CategoryId, x => x.Count);

            var result = categories.Select(c => new AssetCategoryResponseDto
            {
                Id = c.Id,
                CategoryName = c.CategoryName,
                HandlingType = c.HandlingType,
                Description = c.Description,
                Status = c.Status,
                TenantId = c.TenantId,
                Items = assetCounts.TryGetValue(c.Id, out var count) ? count : 0
            }).ToList();

            return Ok(result);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<AssetCategoryResponseDto>> GetAssetCategory(string id)
        {
            var tenantId = GetCurrentTenantId();
            var category = await _context.AssetCategories.FindAsync(id);

            if (category == null) return NotFound();
            if (!IsSuperAdmin() && tenantId.HasValue && category.TenantId != null && category.TenantId != tenantId)
                return NotFound();

            var itemCount = await _context.Assets
                .Where(a => a.CategoryId == id)
                .Where(a => IsSuperAdmin() || !tenantId.HasValue || a.TenantId == tenantId)
                .CountAsync();

            return Ok(new AssetCategoryResponseDto
            {
                Id = category.Id,
                CategoryName = category.CategoryName,
                HandlingType = category.HandlingType,
                Description = category.Description,
                Status = category.Status,
                TenantId = category.TenantId,
                Items = itemCount
            });
        }

        [HttpPost]
        [Authorize(Roles = "Admin,Finance,Super Admin")]
        public async Task<ActionResult<AssetCategoryResponseDto>> PostAssetCategory(CreateAssetCategoryDto dto)
        {
            var tenantId = GetCurrentTenantId();

            var category = new AssetCategory
            {
                Id = Guid.NewGuid().ToString(),
                CategoryName = dto.CategoryName,
                HandlingType = dto.HandlingType,
                Description = dto.Description,
                Status = "Active",
                TenantId = IsSuperAdmin() ? null : tenantId
            };

            _context.AssetCategories.Add(category);
            await _context.SaveChangesAsync();

            return CreatedAtAction("GetAssetCategory", new { id = category.Id }, new AssetCategoryResponseDto
            {
                Id = category.Id,
                CategoryName = category.CategoryName,
                HandlingType = category.HandlingType,
                Description = category.Description,
                Status = category.Status,
                TenantId = category.TenantId,
                Items = 0
            });
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "Admin,Finance,Super Admin")]
        public async Task<IActionResult> PutAssetCategory(string id, UpdateAssetCategoryDto dto)
        {
            var tenantId = GetCurrentTenantId();
            var existing = await _context.AssetCategories.FindAsync(id);

            if (existing == null) return NotFound();
            if (!IsSuperAdmin() && tenantId.HasValue && existing.TenantId != null && existing.TenantId != tenantId)
                return NotFound();

            existing.CategoryName = dto.CategoryName;
            existing.HandlingType = dto.HandlingType;
            existing.Description = dto.Description;

            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpPut("archive/{id}")]
        [Authorize(Roles = "Admin,Finance,Super Admin")]
        public async Task<IActionResult> ArchiveAssetCategory(string id)
        {
            var tenantId = GetCurrentTenantId();
            var category = await _context.AssetCategories.FindAsync(id);

            if (category == null) return NotFound();
            if (!IsSuperAdmin() && tenantId.HasValue && category.TenantId != null && category.TenantId != tenantId)
                return NotFound();

            category.Status = "Archived";
            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpPut("restore/{id}")]
        [Authorize(Roles = "Admin,Finance,Super Admin")]
        public async Task<IActionResult> RestoreAssetCategory(string id)
        {
            var tenantId = GetCurrentTenantId();
            var category = await _context.AssetCategories.FindAsync(id);

            if (category == null) return NotFound();
            if (!IsSuperAdmin() && tenantId.HasValue && category.TenantId != null && category.TenantId != tenantId)
                return NotFound();

            category.Status = "Active";
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }
}
