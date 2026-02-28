using DFile.backend.Data;
using DFile.backend.Models;
using DFile.backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DFile.backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class AssetCategoriesController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IAuditService _auditService;

        public AssetCategoriesController(AppDbContext context, IAuditService auditService)
        {
            _context = context;
            _auditService = auditService;
        }

        private int? GetTenantId()
        {
            var tenantIdStr = User.FindFirst("TenantId")?.Value;
            return int.TryParse(tenantIdStr, out var id) ? id : null;
        }

        private string? GetUserId()
        {
            return User.FindFirst("sub")?.Value ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        }

        private string GetUserEmail()
        {
            return User.FindFirst("email")?.Value ?? "Unknown";
        }

        // GET: api/AssetCategories
        [HttpGet]
        public async Task<ActionResult<IEnumerable<object>>> GetAssetCategories([FromQuery] bool includeArchived = false)
        {
            var tenantId = GetTenantId();
            
            var query = _context.AssetCategories.AsQueryable();
            
            if (tenantId.HasValue)
            {
                query = query.Where(c => c.TenantId == tenantId.Value);
            }

            if (!includeArchived)
            {
                query = query.Where(c => !c.IsArchived);
            }

            var categories = await query.ToListAsync();

            // Calculate item counts per tenant
            var assetCountsQuery = _context.Assets.AsQueryable();
            if (tenantId.HasValue)
            {
                assetCountsQuery = assetCountsQuery.Where(a => a.TenantId == tenantId.Value);
            }

            var assetCounts = await assetCountsQuery
                .GroupBy(a => a.Cat)
                .Select(g => new { Name = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.Name, x => x.Count);

            var result = categories.Select(c => new 
            {
                c.Id,
                c.Name,
                c.Description,
                c.HandlingType,
                c.Status,
                c.IsArchived,
                c.CreatedAt,
                c.CreatedBy,
                c.UpdatedAt,
                c.UpdatedBy,
                c.ArchivedAt,
                c.ArchivedBy,
                Items = assetCounts.ContainsKey(c.Name) ? assetCounts[c.Name] : 0
            });

            return Ok(result);
        }

        // GET: api/AssetCategories/5
        [HttpGet("{id}")]
        public async Task<ActionResult<AssetCategory>> GetAssetCategory(string id)
        {
            var category = await _context.AssetCategories.FindAsync(id);

            if (category == null)
            {
                return NotFound();
            }

            var tenantId = GetTenantId();
            if (tenantId.HasValue && category.TenantId != tenantId.Value)
            {
                return Forbid();
            }

            return category;
        }

        // POST: api/AssetCategories
        [HttpPost]
        public async Task<ActionResult<AssetCategory>> PostAssetCategory(AssetCategory category)
        {
            var tenantId = GetTenantId();
            var userId = GetUserId();
            var userEmail = GetUserEmail();

            // Unique name per tenant validation (including archived to prevent restoration conflicts)
            var exists = await _context.AssetCategories
                .AnyAsync(c => c.TenantId == tenantId && c.Name.ToLower() == category.Name.ToLower());
            
            if (exists)
            {
                return BadRequest(new { message = "A category with this name already exists for this tenant." });
            }

            category.Id = Guid.NewGuid().ToString();
            category.TenantId = tenantId;
            category.CreatedBy = userEmail;
            category.CreatedAt = DateTime.UtcNow;
            category.UpdatedBy = userEmail;
            category.UpdatedAt = DateTime.UtcNow;
            category.Status = "Active";
            category.IsArchived = false;

            _context.AssetCategories.Add(category);
            await _context.SaveChangesAsync();

            await _auditService.LogActionAsync(
                userId ?? "System",
                userEmail,
                "AssetCategoryCreated",
                $"Created asset category: {category.Name} (Handling: {category.HandlingType})",
                tenantId
            );

            return CreatedAtAction("GetAssetCategory", new { id = category.Id }, category);
        }

        // PUT: api/AssetCategories/5
        [HttpPut("{id}")]
        public async Task<IActionResult> PutAssetCategory(string id, AssetCategory updatedCategory)
        {
            var category = await _context.AssetCategories.FindAsync(id);
            if (category == null)
            {
                return NotFound();
            }

            var tenantId = GetTenantId();
            if (tenantId.HasValue && category.TenantId != tenantId.Value)
            {
                return Forbid();
            }

            var userId = GetUserId();
            var userEmail = GetUserEmail();

            // Check if name changed and if new name already exists
            if (category.Name.ToLower() != updatedCategory.Name.ToLower())
            {
                var exists = await _context.AssetCategories
                    .AnyAsync(c => c.TenantId == tenantId && c.Name.ToLower() == updatedCategory.Name.ToLower() && c.Id != id);
                
                if (exists)
                {
                    return BadRequest(new { message = "A category with this name already exists for this tenant." });
                }
            }

            var oldName = category.Name;
            category.Name = updatedCategory.Name;
            category.Description = updatedCategory.Description;
            category.HandlingType = updatedCategory.HandlingType;
            category.UpdatedAt = DateTime.UtcNow;
            category.UpdatedBy = userEmail;

            _context.Entry(category).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
                
                await _auditService.LogActionAsync(
                    userId ?? "System",
                    userEmail,
                    "AssetCategoryUpdated",
                    $"Updated asset category: {oldName} -> {category.Name}",
                    tenantId
                );
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!CategoryExists(id))
                {
                    return NotFound();
                }
                else
                {
                    throw;
                }
            }

            return NoContent();
        }

        // PUT: api/AssetCategories/archive/5
        [HttpPut("archive/{id}")]
        public async Task<IActionResult> ArchiveAssetCategory(string id)
        {
            var category = await _context.AssetCategories.FindAsync(id);
            if (category == null)
            {
                return NotFound();
            }

            var tenantId = GetTenantId();
            if (tenantId.HasValue && category.TenantId != tenantId.Value)
            {
                return Forbid();
            }

            var userId = GetUserId();
            var userEmail = GetUserEmail();

            category.Status = "Archived";
            category.IsArchived = true;
            category.ArchivedAt = DateTime.UtcNow;
            category.ArchivedBy = userEmail;
            
            _context.Entry(category).State = EntityState.Modified;
            await _context.SaveChangesAsync();

            await _auditService.LogActionAsync(
                userId ?? "System",
                userEmail,
                "AssetCategoryArchived",
                $"Archived asset category: {category.Name}",
                tenantId
            );

            return NoContent();
        }
        
        // PUT: api/AssetCategories/restore/5
        [HttpPut("restore/{id}")]
        public async Task<IActionResult> RestoreAssetCategory(string id)
        {
            var category = await _context.AssetCategories.FindAsync(id);
            if (category == null)
            {
                return NotFound();
            }

            var tenantId = GetTenantId();
            if (tenantId.HasValue && category.TenantId != tenantId.Value)
            {
                return Forbid();
            }

            var userId = GetUserId();
            var userEmail = GetUserEmail();

            category.Status = "Active";
            category.IsArchived = false;
            category.ArchivedAt = null;
            category.ArchivedBy = null;
            category.UpdatedAt = DateTime.UtcNow;
            category.UpdatedBy = userEmail;

            _context.Entry(category).State = EntityState.Modified;
            await _context.SaveChangesAsync();

            await _auditService.LogActionAsync(
                userId ?? "System",
                userEmail,
                "AssetCategoryRestored",
                $"Restored asset category: {category.Name}",
                tenantId
            );

            return NoContent();
        }

        private bool CategoryExists(string id)
        {
            return _context.AssetCategories.Any(e => e.Id == id);
        }
    }
}
