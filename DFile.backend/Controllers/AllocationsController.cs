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
    public class AllocationsController : TenantAwareController
    {
        private readonly AppDbContext _context;
        private readonly PermissionService _permissionService;
        private readonly IAuditService _auditService;

        public AllocationsController(AppDbContext context, PermissionService permissionService, IAuditService auditService)
        {
            _context = context;
            _permissionService = permissionService;
            _auditService = auditService;
        }

        private int? GetCurrentUserId()
        {
            var claim = User.FindFirst("UserId")?.Value ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            return string.IsNullOrEmpty(claim) ? null : int.Parse(claim);
        }

        // ── POST /api/allocations ──────────────────────────────────
        // Allocate an available asset to a room unit.
        [HttpPost]
        [RequirePermission("Assets", "CanCreate")]
        public async Task<ActionResult<AssetAllocationResponseDto>> AllocateAsset(AllocateAssetRequestDto dto)
        {
            var tenantId = GetCurrentTenantId();
            var userId = GetCurrentUserId();

            // Validate asset
            var asset = await _context.Assets.FindAsync(dto.AssetId);
            if (asset == null) return NotFound(new { message = "Asset not found." });
            if (!IsSuperAdmin() && tenantId.HasValue && asset.TenantId != tenantId)
                return NotFound(new { message = "Asset not found." });
            if (asset.IsArchived)
                return BadRequest(new { message = "Archived assets cannot be allocated." });
            if (asset.LifecycleStatus == LifecycleStatus.Disposed)
                return BadRequest(new { message = "Disposed assets cannot be allocated." });

            // Validate room
            var room = await _context.Rooms
                .Include(r => r.RoomCategory)
                .FirstOrDefaultAsync(r => r.Id == dto.RoomId);
            if (room == null) return NotFound(new { message = "Room unit not found." });
            if (!IsSuperAdmin() && tenantId.HasValue && room.TenantId != tenantId)
                return NotFound(new { message = "Room unit not found." });
            if (room.IsArchived)
                return BadRequest(new { message = "Cannot allocate to an archived room unit." });

            // Check no active allocation already exists for this asset
            var existing = await _context.AssetAllocations
                .FirstOrDefaultAsync(a => a.AssetId == dto.AssetId && a.Status == "Active");
            if (existing != null)
                return Conflict(new { message = "This asset is already allocated. Deallocate it first before reassigning." });

            // Create allocation record
            var allocation = new AssetAllocation
            {
                Id = await RecordCodeGenerator.GenerateAllocationIdAsync(_context),
                AssetId = dto.AssetId,
                RoomId = dto.RoomId,
                Status = "Active",
                Remarks = dto.Remarks?.Trim(),
                AllocatedAt = DateTime.UtcNow,
                AllocatedBy = userId,
                TenantId = tenantId,
            };

            // Update asset audit fields
            asset.UpdatedAt = DateTime.UtcNow;
            asset.UpdatedBy = userId;

            _context.AssetAllocations.Add(allocation);

            _auditService.Add(HttpContext, new AuditLog
            {
                Action = "Allocate",
                EntityType = "Asset",
                EntityId = dto.AssetId,
                Module = "Allocation",
                UserId = userId,
                TenantId = tenantId,
                Description = $"Allocated asset {asset.AssetCode} to room {room.RoomCode}.",
                NewValues = JsonSerializer.Serialize(new
                {
                    AssetId = dto.AssetId,
                    RoomId = dto.RoomId,
                    RoomCode = room.RoomCode,
                    Remarks = dto.Remarks
                }),
            });

            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetAllocationHistory), new { assetId = dto.AssetId },
                BuildResponseDto(allocation, asset, room));
        }

        // ── PUT /api/allocations/deallocate/{assetId} ─────────────
        // Deallocate an asset, making it available again.
        [HttpPut("deallocate/{assetId}")]
        [RequirePermission("Assets", "CanEdit")]
        public async Task<IActionResult> DeallocateAsset(string assetId)
        {
            var tenantId = GetCurrentTenantId();
            var userId = GetCurrentUserId();

            var asset = await _context.Assets.FindAsync(assetId);
            if (asset == null) return NotFound(new { message = "Asset not found." });
            if (!IsSuperAdmin() && tenantId.HasValue && asset.TenantId != tenantId)
                return NotFound(new { message = "Asset not found." });

            var allocation = await _context.AssetAllocations
                .FirstOrDefaultAsync(a => a.AssetId == assetId && a.Status == "Active");
            if (allocation == null)
                return NotFound(new { message = "No active allocation found for this asset." });

            // Close allocation record
            allocation.Status = "Inactive";
            allocation.DeallocatedAt = DateTime.UtcNow;
            allocation.DeallocatedBy = userId;

            // Update asset audit fields
            asset.UpdatedAt = DateTime.UtcNow;
            asset.UpdatedBy = userId;

            _auditService.Add(HttpContext, new AuditLog
            {
                Action = "Deallocate",
                EntityType = "Asset",
                EntityId = assetId,
                Module = "Allocation",
                UserId = userId,
                TenantId = tenantId,
                Description = $"Deallocated asset {asset.AssetCode} from active room assignment.",
                OldValues = JsonSerializer.Serialize(new { AllocationId = allocation.Id }),
                NewValues = JsonSerializer.Serialize(new { Status = "Inactive", DeallocatedAt = allocation.DeallocatedAt }),
            });

            await _context.SaveChangesAsync();
            return NoContent();
        }

        // ── GET /api/allocations/asset/{assetId} ──────────────────
        // Get allocation history for a specific asset.
        [HttpGet("asset/{assetId}")]
        [RequirePermission("Assets", "CanView")]
        public async Task<ActionResult<IEnumerable<AssetAllocationResponseDto>>> GetAllocationHistory(string assetId)
        {
            var tenantId = GetCurrentTenantId();

            var asset = await _context.Assets.FindAsync(assetId);
            if (asset == null) return NotFound(new { message = "Asset not found." });
            if (!IsSuperAdmin() && tenantId.HasValue && asset.TenantId != tenantId)
                return NotFound(new { message = "Asset not found." });

            var allocations = await _context.AssetAllocations
                .Include(a => a.Room).ThenInclude(r => r!.RoomCategory)
                .Include(a => a.AllocatedByUser)
                .Where(a => a.AssetId == assetId)
                .OrderByDescending(a => a.AllocatedAt)
                .ToListAsync();

            return Ok(allocations.Select(a => BuildResponseDto(a, asset, a.Room)));
        }

        // ── GET /api/allocations/active ────────────────────────────
        // Get all active allocations for the tenant.
        // Maintenance staff need this list for scheduling even when a tenant role hides Assets.CanView.
        [HttpGet("active")]
        public async Task<ActionResult<IEnumerable<AssetAllocationResponseDto>>> GetActiveAllocations()
        {
            var tenantId = GetCurrentTenantId();
            var userId = GetCurrentUserId();

            if (!IsSuperAdmin())
            {
                if (!tenantId.HasValue || !userId.HasValue)
                    return Forbid();
                var canAssets = await _permissionService.HasPermission(userId.Value, tenantId.Value, "Assets", "CanView");
                var canMaintenance = await _permissionService.HasPermission(userId.Value, tenantId.Value, "Maintenance", "CanView");
                if (!canAssets && !canMaintenance)
                {
                    return StatusCode(403, new { message = "You do not have permission to view allocations." });
                }
            }

            var query = _context.AssetAllocations
                .Include(a => a.Asset)
                .Include(a => a.Room).ThenInclude(r => r!.RoomCategory)
                .Include(a => a.AllocatedByUser)
                .Where(a => a.Status == "Active");

            if (!IsSuperAdmin() && tenantId.HasValue)
            {
                // Include legacy rows where allocation tenant is null but linked entities belong to tenant.
                query = query.Where(a =>
                    a.TenantId == tenantId ||
                    (a.TenantId == null && (
                        (a.Asset != null && a.Asset.TenantId == tenantId) ||
                        (a.Room != null && a.Room.TenantId == tenantId)
                    )));
            }

            var allocations = await query.OrderByDescending(a => a.AllocatedAt).ToListAsync();

            return Ok(allocations.Select(a => BuildResponseDto(a, a.Asset, a.Room)));
        }

        // ── Helpers ───────────────────────────────────────────────

        private static AssetAllocationResponseDto BuildResponseDto(AssetAllocation a, Asset? asset, Room? room) => new()
        {
            Id = a.Id,
            AssetId = a.AssetId,
            AssetName = asset?.AssetName ?? string.Empty,
            AssetCode = asset?.AssetCode,
            TagNumber = null,
            RoomId = a.RoomId,
            RoomCode = room?.RoomCode ?? string.Empty,
            RoomName = room?.Name ?? string.Empty,
            RoomCategoryName = room?.RoomCategory?.Name,
            PreviousRoomId = a.PreviousRoomId,
            Status = a.Status,
            Remarks = a.Remarks,
            AllocatedAt = a.AllocatedAt,
            DeallocatedAt = a.DeallocatedAt,
            AllocatedByName = a.AllocatedByUser != null
                ? $"{a.AllocatedByUser.FirstName} {a.AllocatedByUser.LastName}"
                : null,
            TenantId = a.TenantId
        };
    }
}
