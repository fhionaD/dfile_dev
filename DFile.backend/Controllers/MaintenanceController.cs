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
        public async Task<ActionResult<IEnumerable<MaintenanceRecord>>> GetMaintenanceRecords([FromQuery] bool showArchived = false)
        {
            var tenantId = GetCurrentTenantId();
            var query = _context.MaintenanceRecords.Where(r => r.IsArchived == showArchived);

            if (!IsSuperAdmin() && tenantId.HasValue)
            {
                query = query.Where(r => r.TenantId == tenantId);
            }

            return await query.OrderByDescending(r => r.CreatedAt).ToListAsync();
        }

        [HttpGet("{id}")]
        [RequirePermission("Maintenance", "CanView")]
        public async Task<ActionResult<MaintenanceRecord>> GetMaintenanceRecord(string id)
        {
            var tenantId = GetCurrentTenantId();
            var record = await _context.MaintenanceRecords.FindAsync(id);

            if (record == null) return NotFound();
            if (!IsSuperAdmin() && tenantId.HasValue && record.TenantId != tenantId) return NotFound();

            return record;
        }

        [HttpPost]
        [RequirePermission("Maintenance", "CanCreate")]
        public async Task<ActionResult<MaintenanceRecord>> PostMaintenanceRecord(CreateMaintenanceRecordDto dto)
        {
            var tenantId = GetCurrentTenantId();

            // Validate AssetId exists and belongs to same tenant
            var asset = await _context.Assets.FindAsync(dto.AssetId);
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

            return CreatedAtAction("GetMaintenanceRecord", new { id = record.Id }, record);
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
    }
}
