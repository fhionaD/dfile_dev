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
    [Authorize(Roles = "Admin,Finance,Maintenance,Super Admin")]
    public class AssetsController : TenantAwareController
    {
        private readonly AppDbContext _context;

        public AssetsController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<AssetResponseDto>>> GetAssets([FromQuery] bool showArchived = false)
        {
            var tenantId = GetCurrentTenantId();
            var query = _context.Assets.AsQueryable();

            if (!IsSuperAdmin() && tenantId.HasValue)
            {
                query = query.Where(a => a.TenantId == tenantId);
            }

            if (showArchived == true)
            {
                query = query.Where(a => a.Archived || a.Status == "Archived");
            }
            else
            {
                query = query.Where(a => !a.Archived && a.Status != "Archived");
            }

            var assets = await query.ToListAsync();
            var categoryIds = assets.Where(a => a.CategoryId != null).Select(a => a.CategoryId!).Distinct().ToList();
            var categories = await _context.AssetCategories.Where(c => categoryIds.Contains(c.Id)).ToDictionaryAsync(c => c.Id);

            var result = assets.Select(a =>
            {
                categories.TryGetValue(a.CategoryId ?? "", out var cat);
                return MapToDto(a, cat);
            }).ToList();

            return Ok(result);
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<AssetResponseDto>> GetAsset(string id)
        {
            var tenantId = GetCurrentTenantId();
            var asset = await _context.Assets.FindAsync(id);

            if (asset == null) return NotFound();
            if (!IsSuperAdmin() && tenantId.HasValue && asset.TenantId != tenantId) return NotFound();

            AssetCategory? cat = null;
            if (!string.IsNullOrEmpty(asset.CategoryId))
                cat = await _context.AssetCategories.FindAsync(asset.CategoryId);

            return Ok(MapToDto(asset, cat));
        }

        [HttpPost]
        public async Task<ActionResult<AssetResponseDto>> PostAsset(CreateAssetDto dto)
        {
            var tenantId = GetCurrentTenantId();
            var effectiveTenantId = IsSuperAdmin() ? null : tenantId;

            if (!string.IsNullOrEmpty(dto.CategoryId))
            {
                var categoryExists = await _context.AssetCategories.AnyAsync(c => c.Id == dto.CategoryId);
                if (!categoryExists) return BadRequest(new { message = "Invalid CategoryId." });
            }
            else
            {
                return BadRequest(new { message = "CategoryId is required." });
            }

            var tagConflict = await _context.Assets.AnyAsync(a =>
                a.TagNumber == dto.TagNumber && a.TenantId == effectiveTenantId);
            if (tagConflict) return Conflict(new { message = $"TagNumber '{dto.TagNumber}' already exists for this tenant." });

            var asset = new Asset
            {
                Id = Guid.NewGuid().ToString(),
                TagNumber = dto.TagNumber,
                Desc = dto.Desc,
                CategoryId = dto.CategoryId,
                Status = dto.Status,
                Room = dto.Room,
                Image = dto.Image,
                Manufacturer = dto.Manufacturer,
                Model = dto.Model,
                SerialNumber = dto.SerialNumber,
                PurchaseDate = dto.PurchaseDate,
                Vendor = dto.Vendor,
                Value = dto.Value,
                UsefulLifeYears = dto.UsefulLifeYears,
                PurchasePrice = dto.PurchasePrice,
                CurrentBookValue = dto.PurchasePrice,
                MonthlyDepreciation = dto.UsefulLifeYears > 0
                    ? Math.Round(dto.PurchasePrice / (dto.UsefulLifeYears * 12), 2)
                    : 0,
                TenantId = effectiveTenantId.HasValue ? effectiveTenantId.Value : null,
                WarrantyExpiry = dto.WarrantyExpiry,
                Notes = dto.Notes,
                Documents = dto.Documents,
                Archived = false
            };

            _context.Assets.Add(asset);
            await _context.SaveChangesAsync();

            AssetCategory? cat = null;
            if (!string.IsNullOrEmpty(asset.CategoryId))
                cat = await _context.AssetCategories.FindAsync(asset.CategoryId);

            return CreatedAtAction("GetAsset", new { id = asset.Id }, MapToDto(asset, cat));
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> PutAsset(string id, UpdateAssetDto dto)
        {
            var tenantId = GetCurrentTenantId();
            var existing = await _context.Assets.FindAsync(id);

            if (existing == null) return NotFound();
            if (!IsSuperAdmin() && tenantId.HasValue && existing.TenantId != tenantId) return NotFound();

            if (!string.IsNullOrEmpty(dto.CategoryId))
            {
                var categoryExists = await _context.AssetCategories.AnyAsync(c => c.Id == dto.CategoryId);
                if (!categoryExists) return BadRequest(new { message = "Invalid CategoryId." });
            }
            else
            {
                return BadRequest(new { message = "CategoryId is required." });
            }

            if (dto.TagNumber != existing.TagNumber)
            {
                var tagConflict = await _context.Assets.AnyAsync(a =>
                    a.TagNumber == dto.TagNumber && a.TenantId == existing.TenantId && a.Id != id);
                if (tagConflict) return Conflict(new { message = $"TagNumber '{dto.TagNumber}' already exists for this tenant." });
            }

            // Operational fields — all authorized roles can update
            existing.TagNumber = dto.TagNumber;
            existing.Desc = dto.Desc;
            existing.CategoryId = dto.CategoryId;
            existing.Status = dto.Status;
            existing.Room = dto.Room;
            existing.Image = dto.Image;
            existing.Manufacturer = dto.Manufacturer;
            existing.Model = dto.Model;
            existing.SerialNumber = dto.SerialNumber;
            existing.PurchaseDate = dto.PurchaseDate;
            existing.Vendor = dto.Vendor;
            existing.WarrantyExpiry = dto.WarrantyExpiry;
            existing.Notes = dto.Notes;
            existing.Documents = dto.Documents;

            // Financial fields — restricted to Admin, Finance, Super Admin
            if (User.IsInRole("Admin") || User.IsInRole("Finance") || IsSuperAdmin())
            {
                existing.Value = dto.Value;
                existing.UsefulLifeYears = dto.UsefulLifeYears;
                existing.PurchasePrice = dto.PurchasePrice;
                existing.CurrentBookValue = dto.CurrentBookValue;

                // Auto-recalculate depreciation when financial inputs change
                existing.MonthlyDepreciation = dto.UsefulLifeYears > 0
                    ? Math.Round(dto.PurchasePrice / (dto.UsefulLifeYears * 12), 2)
                    : 0;
            }

            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpPut("{id}/financial")]
        [Authorize(Roles = "Admin,Finance,Super Admin")]
        public async Task<IActionResult> PutAssetFinancial(string id, UpdateAssetFinancialDto dto)
        {
            var tenantId = GetCurrentTenantId();
            var existing = await _context.Assets.FindAsync(id);

            if (existing == null) return NotFound();
            if (!IsSuperAdmin() && tenantId.HasValue && existing.TenantId != tenantId) return NotFound();

            existing.PurchasePrice = dto.PurchasePrice;
            existing.Value = dto.Value;
            existing.UsefulLifeYears = dto.UsefulLifeYears;

            // Auto-recalculate depreciation
            existing.MonthlyDepreciation = dto.UsefulLifeYears > 0
                ? Math.Round(dto.PurchasePrice / (dto.UsefulLifeYears * 12), 2)
                : 0;

            if (dto.CurrentBookValue.HasValue)
                existing.CurrentBookValue = dto.CurrentBookValue.Value;

            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpPut("allocate/{id}")]
        public async Task<IActionResult> AllocateAsset(string id, AllocateAssetDto dto)
        {
            var tenantId = GetCurrentTenantId();
            var asset = await _context.Assets.FindAsync(id);

            if (asset == null) return NotFound();
            if (!IsSuperAdmin() && tenantId.HasValue && asset.TenantId != tenantId) return NotFound();

            asset.Room = dto.Room;
            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpPut("archive/{id}")]
        [Authorize(Roles = "Admin,Super Admin")]
        public async Task<IActionResult> ArchiveAsset(string id)
        {
            var tenantId = GetCurrentTenantId();
            var asset = await _context.Assets.FindAsync(id);

            if (asset == null) return NotFound();
            if (!IsSuperAdmin() && tenantId.HasValue && asset.TenantId != tenantId) return NotFound();

            asset.Status = "Archived";
            asset.Archived = true;
            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpPut("restore/{id}")]
        [Authorize(Roles = "Admin,Super Admin")]
        public async Task<IActionResult> RestoreAsset(string id)
        {
            var tenantId = GetCurrentTenantId();
            var asset = await _context.Assets.FindAsync(id);

            if (asset == null) return NotFound();
            if (!IsSuperAdmin() && tenantId.HasValue && asset.TenantId != tenantId) return NotFound();

            asset.Status = "Active";
            asset.Archived = false;
            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin,Super Admin")]
        public async Task<IActionResult> DeleteAsset(string id)
        {
            var tenantId = GetCurrentTenantId();
            var asset = await _context.Assets.FindAsync(id);

            if (asset == null) return NotFound();
            if (!IsSuperAdmin() && tenantId.HasValue && asset.TenantId != tenantId) return NotFound();

            _context.Assets.Remove(asset);
            await _context.SaveChangesAsync();
            return NoContent();
        }

        private static AssetResponseDto MapToDto(Asset a, AssetCategory? cat) => new()
        {
            Id = a.Id,
            TagNumber = a.TagNumber,
            Desc = a.Desc,
            CategoryId = a.CategoryId,
            CategoryName = cat?.CategoryName,
            HandlingType = cat?.HandlingType,
            Status = a.Status,
            Room = a.Room,
            Image = a.Image,
            Manufacturer = a.Manufacturer,
            Model = a.Model,
            SerialNumber = a.SerialNumber,
            PurchaseDate = a.PurchaseDate,
            Vendor = a.Vendor,
            Value = a.Value,
            UsefulLifeYears = a.UsefulLifeYears,
            PurchasePrice = a.PurchasePrice,
            CurrentBookValue = a.CurrentBookValue,
            MonthlyDepreciation = a.MonthlyDepreciation,
            TenantId = a.TenantId,
            WarrantyExpiry = a.WarrantyExpiry,
            Notes = a.Notes,
            Documents = a.Documents,
            Archived = a.Archived
        };
    }
}
