using DFile.backend.Authorization;
using DFile.backend.Data;
using DFile.backend.DTOs;
using DFile.backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DFile.backend.Controllers
{
    [Authorize]
    [Route("api/maintenance")]
    [ApiController]
    public class MaintenanceController : TenantAwareController
    {
        private readonly AppDbContext _context;

        public MaintenanceController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        [RequirePermission("Maintenance", "CanView")]
        public async Task<ActionResult<IEnumerable<MaintenanceRecordResponseDto>>> GetMaintenanceRecords([FromQuery] bool showArchived = false)
        {
            var tenantId = GetCurrentTenantId();
            var query = _context.MaintenanceRecords
                .Include(r => r.Asset)
                    .ThenInclude(a => a!.Category)
                .Where(r => r.IsArchived == showArchived);

            if (!IsSuperAdmin() && tenantId.HasValue)
            {
                query = query.Where(r => r.TenantId == tenantId);
            }

            var records = await query.OrderByDescending(r => r.CreatedAt).ToListAsync();

            // Batch-fetch active allocations for all assets referenced by these records
            var assetIds = records.Select(r => r.AssetId).Distinct().ToList();
            var activeAllocations = await _context.AssetAllocations
                .Include(aa => aa.Room)
                .Where(aa => assetIds.Contains(aa.AssetId) && aa.Status == "Active")
                .ToDictionaryAsync(aa => aa.AssetId);

            var result = records.Select(r => MapToDto(r, activeAllocations)).ToList();
            return Ok(result);
        }

        [HttpGet("{id}")]
        [RequirePermission("Maintenance", "CanView")]
        public async Task<ActionResult<MaintenanceRecordResponseDto>> GetMaintenanceRecord(string id)
        {
            var tenantId = GetCurrentTenantId();
            var record = await _context.MaintenanceRecords
                .Include(r => r.Asset)
                    .ThenInclude(a => a!.Category)
                .FirstOrDefaultAsync(r => r.Id == id);

            if (record == null) return NotFound();
            if (!IsSuperAdmin() && tenantId.HasValue && record.TenantId != tenantId) return NotFound();

            var activeAllocation = await _context.AssetAllocations
                .Include(aa => aa.Room)
                .FirstOrDefaultAsync(aa => aa.AssetId == record.AssetId && aa.Status == "Active");

            var allocDict = new Dictionary<string, AssetAllocation>();
            if (activeAllocation != null) allocDict[record.AssetId] = activeAllocation;

            return Ok(MapToDto(record, allocDict));
        }

        [HttpPost]
        [RequirePermission("Maintenance", "CanCreate")]
        public async Task<ActionResult<MaintenanceRecordResponseDto>> PostMaintenanceRecord(CreateMaintenanceRecordDto dto)
        {
            var tenantId = GetCurrentTenantId();

            // Validate AssetId exists and belongs to same tenant
            var asset = await _context.Assets
                .Include(a => a.Category)
                .FirstOrDefaultAsync(a => a.Id == dto.AssetId);
            if (asset == null) return BadRequest(new { message = "Asset not found." });
            if (!IsSuperAdmin() && tenantId.HasValue && asset.TenantId != tenantId)
                return BadRequest(new { message = "Asset does not belong to your organization." });
            if (asset.LifecycleStatus == LifecycleStatus.Disposed)
                return BadRequest(new { message = "Cannot create maintenance records for disposed assets." });
            if (asset.IsArchived)
                return BadRequest(new { message = "Cannot create maintenance records for archived assets." });

            var record = new MaintenanceRecord
            {
                Id = Guid.NewGuid().ToString(),
                AssetId = dto.AssetId,
                Description = dto.Description,
                Status = dto.Status,
                Priority = dto.Priority,
                Type = dto.Type,
                Frequency = dto.Frequency,
                StartDate = dto.StartDate,
                EndDate = dto.EndDate,
                Cost = dto.Cost,
                Attachments = dto.Attachments,
                DateReported = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                TenantId = IsSuperAdmin() ? null : tenantId,
                IsArchived = false
            };

            _context.MaintenanceRecords.Add(record);
            await _context.SaveChangesAsync();

            // Re-attach Asset for DTO mapping
            record.Asset = asset;

            var activeAllocation = await _context.AssetAllocations
                .Include(aa => aa.Room)
                .FirstOrDefaultAsync(aa => aa.AssetId == dto.AssetId && aa.Status == "Active");

            var allocDict = new Dictionary<string, AssetAllocation>();
            if (activeAllocation != null) allocDict[dto.AssetId] = activeAllocation;

            return CreatedAtAction("GetMaintenanceRecord", new { id = record.Id }, MapToDto(record, allocDict));
        }

        [HttpPut("{id}")]
        [RequirePermission("Maintenance", "CanEdit")]
        public async Task<IActionResult> PutMaintenanceRecord(string id, UpdateMaintenanceRecordDto dto)
        {
            var tenantId = GetCurrentTenantId();
            var existing = await _context.MaintenanceRecords.FindAsync(id);

            if (existing == null) return NotFound();
            if (!IsSuperAdmin() && tenantId.HasValue && existing.TenantId != tenantId) return NotFound();

            // Validate AssetId exists and belongs to same tenant
            var asset = await _context.Assets.FindAsync(dto.AssetId);
            if (asset == null) return BadRequest(new { message = "Asset not found." });
            if (!IsSuperAdmin() && tenantId.HasValue && asset.TenantId != tenantId)
                return BadRequest(new { message = "Asset does not belong to your organization." });

            existing.AssetId = dto.AssetId;
            existing.Description = dto.Description;
            existing.Status = dto.Status;
            existing.Priority = dto.Priority;
            existing.Type = dto.Type;
            existing.Frequency = dto.Frequency;
            existing.StartDate = dto.StartDate;
            existing.EndDate = dto.EndDate;
            existing.Cost = dto.Cost;
            existing.Attachments = dto.Attachments;
            existing.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpPut("archive/{id}")]
        [RequirePermission("Maintenance", "CanArchive")]
        public async Task<IActionResult> ArchiveMaintenanceRecord(string id)
        {
            var tenantId = GetCurrentTenantId();
            var record = await _context.MaintenanceRecords.FindAsync(id);

            if (record == null) return NotFound();
            if (!IsSuperAdmin() && tenantId.HasValue && record.TenantId != tenantId) return NotFound();

            record.IsArchived = true;
            record.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpPut("restore/{id}")]
        [RequirePermission("Maintenance", "CanArchive")]
        public async Task<IActionResult> RestoreMaintenanceRecord(string id)
        {
            var tenantId = GetCurrentTenantId();
            var record = await _context.MaintenanceRecords.FindAsync(id);

            if (record == null) return NotFound();
            if (!IsSuperAdmin() && tenantId.HasValue && record.TenantId != tenantId) return NotFound();

            record.IsArchived = false;
            record.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpDelete("{id}")]
        [RequirePermission("Maintenance", "CanArchive")]
        public async Task<IActionResult> DeleteMaintenanceRecord(string id)
        {
            var tenantId = GetCurrentTenantId();
            var record = await _context.MaintenanceRecords.FindAsync(id);

            if (record == null) return NotFound();
            if (!IsSuperAdmin() && tenantId.HasValue && record.TenantId != tenantId) return NotFound();

            _context.MaintenanceRecords.Remove(record);
            await _context.SaveChangesAsync();
            return NoContent();
        }

        // ── Helpers ───────────────────────────────────────────────

        private static MaintenanceRecordResponseDto MapToDto(MaintenanceRecord r, Dictionary<string, AssetAllocation> activeAllocations)
        {
            activeAllocations.TryGetValue(r.AssetId, out var alloc);

            return new MaintenanceRecordResponseDto
            {
                Id = r.Id,
                AssetId = r.AssetId,
                AssetName = r.Asset?.AssetName,
                AssetCode = r.Asset?.AssetCode,
                TagNumber = r.Asset?.TagNumber,
                CategoryName = r.Asset?.Category?.CategoryName,
                RoomId = alloc?.Room?.Id,
                RoomCode = alloc?.Room?.RoomCode,
                RoomName = alloc?.Room?.Name,
                Description = r.Description,
                Status = r.Status,
                Priority = r.Priority,
                Type = r.Type,
                Frequency = r.Frequency,
                StartDate = r.StartDate,
                EndDate = r.EndDate,
                Cost = r.Cost,
                Attachments = r.Attachments,
                DateReported = r.DateReported,
                IsArchived = r.IsArchived,
                CreatedAt = r.CreatedAt,
                UpdatedAt = r.UpdatedAt,
                TenantId = r.TenantId
            };
        }
    }
}
