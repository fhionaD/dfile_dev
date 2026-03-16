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
    public class AssetsController : TenantAwareController
    {
        private readonly AppDbContext _context;

        private static readonly Dictionary<LifecycleStatus, string> StatusLabels = new()
        {
            { LifecycleStatus.Registered, "Registered" },
            { LifecycleStatus.Allocated, "Allocated" },
            { LifecycleStatus.InUse, "In Use" },
            { LifecycleStatus.UnderMaintenance, "Under Maintenance" },
            { LifecycleStatus.UnderReview, "Under Review" },
            { LifecycleStatus.ForReplacement, "For Replacement" },
            { LifecycleStatus.Disposed, "Disposed" },
            { LifecycleStatus.Archived, "Archived" }
        };

        private static readonly Dictionary<AssetCondition, string> ConditionLabels = new()
        {
            { AssetCondition.Good, "Good" },
            { AssetCondition.Fair, "Fair" },
            { AssetCondition.Poor, "Poor" },
            { AssetCondition.Critical, "Critical" },
            { AssetCondition.Unknown, "Unknown" }
        };

        public AssetsController(AppDbContext context)
        {
            _context = context;
        }

        private int? GetCurrentUserId()
        {
            var claim = User.FindFirst("UserId")?.Value ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            return string.IsNullOrEmpty(claim) ? null : int.Parse(claim);
        }

        [HttpGet]
        [RequirePermission("Assets", "CanView")]
        public async Task<ActionResult<IEnumerable<AssetResponseDto>>> GetAssets([FromQuery] bool showArchived = false)
        {
            var tenantId = GetCurrentTenantId();
            var query = _context.Assets.AsQueryable();

            if (!IsSuperAdmin() && tenantId.HasValue)
            {
                query = query.Where(a => a.TenantId == tenantId);
            }

            query = query.Where(a => a.IsArchived == showArchived);

            var assets = await query.ToListAsync();
            var categoryIds = assets.Select(a => a.CategoryId).Distinct().ToList();
            var categories = await _context.AssetCategories.Where(c => categoryIds.Contains(c.Id)).ToDictionaryAsync(c => c.Id);

            var assetIds = assets.Select(a => a.Id).ToList();
            var activeAllocations = await _context.AssetAllocations
                .Include(aa => aa.Room)
                .Where(aa => assetIds.Contains(aa.AssetId) && aa.Status == "Active")
                .ToDictionaryAsync(aa => aa.AssetId);

            // Gather user names for audit fields
            var userIds = assets.SelectMany(a => new[] { a.CreatedBy, a.UpdatedBy }).Where(x => x.HasValue).Select(x => x!.Value).Distinct().ToList();
            var userNames = await _context.Users.Where(u => userIds.Contains(u.Id)).ToDictionaryAsync(u => u.Id, u => u.FirstName + " " + u.LastName);

            var result = assets.Select(a =>
            {
                categories.TryGetValue(a.CategoryId, out var cat);
                activeAllocations.TryGetValue(a.Id, out var alloc);
                return MapToDto(a, cat, userNames, alloc?.Room);
            }).ToList();

            return Ok(result);
        }

        [HttpGet("summary")]
        [RequirePermission("Assets", "CanView")]
        public async Task<ActionResult<object>> GetAssetSummary()
        {
            var tenantId = GetCurrentTenantId();
            
            var query = _context.Assets.Where(a => !a.IsArchived && a.LifecycleStatus != LifecycleStatus.Disposed);
            if (!IsSuperAdmin() && tenantId.HasValue)
            {
                query = query.Where(a => a.TenantId == tenantId);
            }

            var totalAssets = await query.CountAsync();
            var originalValue = await query.SumAsync(a => a.AcquisitionCost);
            var bookValue = await query.SumAsync(a => a.CurrentBookValue);

            var activeAllocatedAssetIds = await _context.AssetAllocations
                .Where(aa => aa.Status == "Active")
                .Select(aa => aa.AssetId)
                .ToListAsync();

            var unallocatedCount = await query
                .Where(a => !activeAllocatedAssetIds.Contains(a.Id))
                .CountAsync();

            return Ok(new
            {
                TotalAssets = totalAssets,
                UnallocatedAssets = unallocatedCount,
                OriginalPortfolioValue = originalValue,
                CurrentBookValue = bookValue
            });
        }

        [HttpGet("available-for-allocation")]
        [RequirePermission("Assets", "CanView")]
        public async Task<ActionResult<IEnumerable<AssetResponseDto>>> GetAvailableForAllocation()
        {
            var tenantId = GetCurrentTenantId();
            var query = _context.Assets.Where(a => !a.IsArchived && 
                (a.LifecycleStatus == LifecycleStatus.Registered || a.LifecycleStatus == LifecycleStatus.InUse));

            if (!IsSuperAdmin() && tenantId.HasValue)
            {
                query = query.Where(a => a.TenantId == tenantId);
            }

            var activeAllocatedAssetIds = await _context.AssetAllocations
                .Where(aa => aa.Status == "Active")
                .Select(aa => aa.AssetId)
                .ToListAsync();

            var availableAssets = await query
                .Where(a => !activeAllocatedAssetIds.Contains(a.Id))
                .ToListAsync();

            var categoryIds = availableAssets.Select(a => a.CategoryId).Distinct().ToList();
            var categories = await _context.AssetCategories.Where(c => categoryIds.Contains(c.Id)).ToDictionaryAsync(c => c.Id);

            var userIds = availableAssets.SelectMany(a => new[] { a.CreatedBy, a.UpdatedBy }).Where(x => x.HasValue).Select(x => x!.Value).Distinct().ToList();
            var userNames = await _context.Users.Where(u => userIds.Contains(u.Id)).ToDictionaryAsync(u => u.Id, u => u.FirstName + " " + u.LastName);

            var result = availableAssets.Select(a =>
            {
                categories.TryGetValue(a.CategoryId, out var cat);
                return MapToDto(a, cat, userNames, null); // available assets have no active room
            }).ToList();

            return Ok(result);
        }

        [HttpGet("{id}")]
        [RequirePermission("Assets", "CanView")]
        public async Task<ActionResult<AssetResponseDto>> GetAsset(string id)
        {
            var tenantId = GetCurrentTenantId();
            var asset = await _context.Assets.FindAsync(id);

            if (asset == null) return NotFound();
            if (!IsSuperAdmin() && tenantId.HasValue && asset.TenantId != tenantId) return NotFound();

            AssetCategory? cat = await _context.AssetCategories.FindAsync(asset.CategoryId);

            var userIds = new[] { asset.CreatedBy, asset.UpdatedBy }.Where(x => x.HasValue).Select(x => x!.Value).Distinct().ToList();
            var userNames = await _context.Users.Where(u => userIds.Contains(u.Id)).ToDictionaryAsync(u => u.Id, u => u.FirstName + " " + u.LastName);

            var activeAllocation = await _context.AssetAllocations
                .Include(aa => aa.Room)
                .FirstOrDefaultAsync(aa => aa.AssetId == id && aa.Status == "Active");

            return Ok(MapToDto(asset, cat, userNames, activeAllocation?.Room));
        }

        [HttpPost]
        [RequirePermission("Assets", "CanCreate")]
        public async Task<ActionResult<AssetResponseDto>> PostAsset(CreateAssetDto dto)
        {
            var tenantId = GetCurrentTenantId();
            var userId = GetCurrentUserId();
            var effectiveTenantId = IsSuperAdmin() ? null : tenantId;

            var category = await _context.AssetCategories.FindAsync(dto.CategoryId);
            if (category == null) return BadRequest(new { message = "Invalid CategoryId." });
            if (category.IsArchived) return BadRequest(new { message = "The selected asset category is archived and cannot be used." });

            var generatedTag = await RecordCodeGenerator.GenerateTagNumberAsync(_context);

            var asset = new Asset
            {
                Id = Guid.NewGuid().ToString(),
                AssetCode = await RecordCodeGenerator.GenerateAssetCodeAsync(_context, effectiveTenantId),
                TagNumber = generatedTag,
                AssetName = dto.AssetName,
                CategoryId = dto.CategoryId,
                LifecycleStatus = LifecycleStatus.Registered,
                CurrentCondition = dto.CurrentCondition,
                HandlingTypeSnapshot = category.HandlingType.ToString(),
                Room = null, // Legacy field, ignored during updates/writes
                Image = dto.Image,
                Manufacturer = dto.Manufacturer,
                Model = dto.Model,
                PurchaseDate = dto.PurchaseDate,
                Vendor = dto.Vendor,
                AcquisitionCost = dto.AcquisitionCost,
                UsefulLifeYears = dto.UsefulLifeYears,
                PurchasePrice = dto.PurchasePrice,
                ResidualValue = dto.ResidualValue,
                CurrentBookValue = dto.PurchasePrice,
                MonthlyDepreciation = dto.UsefulLifeYears > 0
                    ? Math.Round(dto.PurchasePrice / (dto.UsefulLifeYears * 12), 2)
                    : 0,
                TenantId = effectiveTenantId.HasValue ? effectiveTenantId.Value : null,
                WarrantyExpiry = dto.WarrantyExpiry,
                Notes = dto.Notes,
                Documents = dto.Documents,
                IsArchived = false,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                CreatedBy = userId,
                UpdatedBy = userId
            };

            _context.Assets.Add(asset);

            _context.AuditLogs.Add(new AuditLog
            {
                Action = "Create",
                EntityType = "Asset",
                EntityId = asset.Id,
                Module = "Asset Management",
                UserId = userId,
                TenantId = effectiveTenantId,
                NewValues = JsonSerializer.Serialize(new { asset.AssetName, asset.TagNumber, asset.CategoryId, Status = StatusLabels.GetValueOrDefault(asset.LifecycleStatus, "Unknown") }),
                IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
                UserAgent = Request.Headers.UserAgent.ToString()
            });

            await _context.SaveChangesAsync();

            return CreatedAtAction("GetAsset", new { id = asset.Id }, MapToDto(asset, category, new Dictionary<int, string>(), null));
        }

        [HttpPut("{id}")]
        [RequirePermission("Assets", "CanEdit")]
        public async Task<IActionResult> PutAsset(string id, UpdateAssetDto dto)
        {
            var tenantId = GetCurrentTenantId();
            var userId = GetCurrentUserId();
            var existing = await _context.Assets.FindAsync(id);

            if (existing == null) return NotFound();
            if (!IsSuperAdmin() && tenantId.HasValue && existing.TenantId != tenantId) return NotFound();

            var category = await _context.AssetCategories.FindAsync(dto.CategoryId);
            if (category == null) return BadRequest(new { message = "Invalid CategoryId." });
            if (category.IsArchived) return BadRequest(new { message = "The selected asset category is archived and cannot be used." });

            // Lifecycle transition validation
            if (existing.LifecycleStatus == LifecycleStatus.Disposed && dto.LifecycleStatus != LifecycleStatus.Disposed)
                return BadRequest(new { message = "A disposed asset cannot be moved back to an active lifecycle state." });

            // Concurrency check
            if (dto.RowVersion != null)
            {
                _context.Entry(existing).Property(p => p.RowVersion).OriginalValue = dto.RowVersion;
            }

            var oldValues = JsonSerializer.Serialize(new { existing.AssetName, existing.TagNumber, existing.CategoryId, Status = StatusLabels.GetValueOrDefault(existing.LifecycleStatus, "Unknown") });

            // Operational fields
            existing.AssetName = dto.AssetName;
            existing.CategoryId = dto.CategoryId;
            existing.LifecycleStatus = dto.LifecycleStatus;
            existing.CurrentCondition = dto.CurrentCondition;
            existing.HandlingTypeSnapshot = category.HandlingType.ToString();
            // existing.Room is ignored for writes to enforce SSOT on AssetAllocations
            existing.Image = dto.Image;
            existing.Manufacturer = dto.Manufacturer;
            existing.Model = dto.Model;
            existing.PurchaseDate = dto.PurchaseDate;
            existing.Vendor = dto.Vendor;
            existing.WarrantyExpiry = dto.WarrantyExpiry;
            existing.Notes = dto.Notes;
            existing.Documents = dto.Documents;
            existing.UpdatedAt = DateTime.UtcNow;
            existing.UpdatedBy = userId;

            // Financial fields — restricted to Admin, Finance, Super Admin
            if (User.IsInRole("Admin") || User.IsInRole("Finance") || IsSuperAdmin())
            {
                existing.AcquisitionCost = dto.AcquisitionCost;
                existing.UsefulLifeYears = dto.UsefulLifeYears;
                existing.PurchasePrice = dto.PurchasePrice;
                existing.ResidualValue = dto.ResidualValue;
                existing.CurrentBookValue = dto.CurrentBookValue;

                existing.MonthlyDepreciation = dto.UsefulLifeYears > 0
                    ? Math.Round(dto.PurchasePrice / (dto.UsefulLifeYears * 12), 2)
                    : 0;
            }

            _context.AuditLogs.Add(new AuditLog
            {
                Action = "Update",
                EntityType = "Asset",
                EntityId = id,
                Module = "Asset Management",
                UserId = userId,
                TenantId = tenantId,
                OldValues = oldValues,
                NewValues = JsonSerializer.Serialize(new { dto.AssetName, existing.TagNumber, dto.CategoryId, Status = StatusLabels.GetValueOrDefault(dto.LifecycleStatus, "Unknown") }),
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

            return NoContent();
        }

        [HttpPut("{id}/financial")]
        [RequirePermission("Assets", "CanEdit")]
        public async Task<IActionResult> PutAssetFinancial(string id, UpdateAssetFinancialDto dto)
        {
            var tenantId = GetCurrentTenantId();
            var userId = GetCurrentUserId();
            var existing = await _context.Assets.FindAsync(id);

            if (existing == null) return NotFound();
            if (!IsSuperAdmin() && tenantId.HasValue && existing.TenantId != tenantId) return NotFound();

            existing.PurchasePrice = dto.PurchasePrice;
            existing.AcquisitionCost = dto.AcquisitionCost;
            existing.UsefulLifeYears = dto.UsefulLifeYears;
            existing.ResidualValue = dto.ResidualValue;

            existing.MonthlyDepreciation = dto.UsefulLifeYears > 0
                ? Math.Round(dto.PurchasePrice / (dto.UsefulLifeYears * 12), 2)
                : 0;

            if (dto.CurrentBookValue.HasValue)
                existing.CurrentBookValue = dto.CurrentBookValue.Value;

            existing.UpdatedAt = DateTime.UtcNow;
            existing.UpdatedBy = userId;

            await _context.SaveChangesAsync();
            return NoContent();
        }

        // The Put AllocateAsset endpoint has been superseded by AllocationsController

        [HttpPut("archive/{id}")]
        [RequirePermission("Assets", "CanArchive")]
        public async Task<IActionResult> ArchiveAsset(string id)
        {
            var tenantId = GetCurrentTenantId();
            var userId = GetCurrentUserId();
            var asset = await _context.Assets.FindAsync(id);

            if (asset == null) return NotFound();
            if (!IsSuperAdmin() && tenantId.HasValue && asset.TenantId != tenantId) return NotFound();

            asset.LifecycleStatus = LifecycleStatus.Archived;
            asset.IsArchived = true;
            asset.UpdatedAt = DateTime.UtcNow;
            asset.UpdatedBy = userId;

            _context.AuditLogs.Add(new AuditLog
            {
                Action = "Archive",
                EntityType = "Asset",
                EntityId = id,
                Module = "Asset Management",
                UserId = userId,
                TenantId = tenantId,
                NewValues = JsonSerializer.Serialize(new { asset.AssetName, asset.TagNumber, IsArchived = true }),
                IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
                UserAgent = Request.Headers.UserAgent.ToString()
            });

            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpPut("restore/{id}")]
        [RequirePermission("Assets", "CanArchive")]
        public async Task<IActionResult> RestoreAsset(string id)
        {
            var tenantId = GetCurrentTenantId();
            var userId = GetCurrentUserId();
            var asset = await _context.Assets.FindAsync(id);

            if (asset == null) return NotFound();
            if (!IsSuperAdmin() && tenantId.HasValue && asset.TenantId != tenantId) return NotFound();

            asset.LifecycleStatus = LifecycleStatus.Registered;
            asset.IsArchived = false;
            asset.UpdatedAt = DateTime.UtcNow;
            asset.UpdatedBy = userId;

            _context.AuditLogs.Add(new AuditLog
            {
                Action = "Restore",
                EntityType = "Asset",
                EntityId = id,
                Module = "Asset Management",
                UserId = userId,
                TenantId = tenantId,
                NewValues = JsonSerializer.Serialize(new { asset.AssetName, asset.TagNumber, IsArchived = false }),
                IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
                UserAgent = Request.Headers.UserAgent.ToString()
            });

            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpDelete("{id}")]
        [RequirePermission("Assets", "CanArchive")]
        public async Task<IActionResult> DeleteAsset(string id)
        {
            var tenantId = GetCurrentTenantId();
            var userId = GetCurrentUserId();
            var asset = await _context.Assets.FindAsync(id);

            if (asset == null) return NotFound();
            if (!IsSuperAdmin() && tenantId.HasValue && asset.TenantId != tenantId) return NotFound();

            _context.AuditLogs.Add(new AuditLog
            {
                Action = "Delete",
                EntityType = "Asset",
                EntityId = id,
                Module = "Asset Management",
                UserId = userId,
                TenantId = tenantId,
                OldValues = JsonSerializer.Serialize(new { asset.AssetName, asset.TagNumber, asset.CategoryId }),
                IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
                UserAgent = Request.Headers.UserAgent.ToString()
            });

            _context.Assets.Remove(asset);
            await _context.SaveChangesAsync();
            return NoContent();
        }

        private static AssetResponseDto MapToDto(Asset a, AssetCategory? cat, Dictionary<int, string> userNames, Room? activeRoom) => new()
        {
            Id = a.Id,
            AssetCode = a.AssetCode,
            TagNumber = a.TagNumber,
            AssetName = a.AssetName,
            CategoryId = a.CategoryId,
            CategoryName = cat?.CategoryName,
            HandlingType = cat?.HandlingType,
            CategoryDisplayName = cat?.DisplayLabel,
            LifecycleStatus = a.LifecycleStatus,
            Status = StatusLabels.GetValueOrDefault(a.LifecycleStatus, "Unknown"),
            CurrentCondition = a.CurrentCondition,
            ConditionLabel = ConditionLabels.GetValueOrDefault(a.CurrentCondition, "Unknown"),
            Room = null, // Deprecated, do not emit stale data
            RoomId = activeRoom?.Id,
            RoomCode = activeRoom?.RoomCode,
            RoomName = activeRoom?.Name,
            AllocationState = activeRoom != null ? "Allocated" : "Unallocated",
            Image = a.Image,
            Manufacturer = a.Manufacturer,
            Model = a.Model,

            PurchaseDate = a.PurchaseDate,
            Vendor = a.Vendor,
            AcquisitionCost = a.AcquisitionCost,
            UsefulLifeYears = a.UsefulLifeYears,
            PurchasePrice = a.PurchasePrice,
            ResidualValue = a.ResidualValue,
            CurrentBookValue = a.CurrentBookValue,
            MonthlyDepreciation = a.MonthlyDepreciation,
            TenantId = a.TenantId,
            WarrantyExpiry = a.WarrantyExpiry,
            Notes = a.Notes,
            Documents = a.Documents,
            IsArchived = a.IsArchived,
            CreatedAt = a.CreatedAt,
            UpdatedAt = a.UpdatedAt,
            CreatedByName = a.CreatedBy.HasValue && userNames.TryGetValue(a.CreatedBy.Value, out var cn) ? cn : null,
            UpdatedByName = a.UpdatedBy.HasValue && userNames.TryGetValue(a.UpdatedBy.Value, out var un) ? un : null,
            RowVersion = a.RowVersion
        };
    }
}
