using DFile.backend.Authorization;
using DFile.backend.Data;
using DFile.backend.DTOs;
using DFile.backend.Models;
using DFile.backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace DFile.backend.Controllers
{
    [Authorize]
    [Route("api/maintenance")]
[Route("api/maintenance-records")]
[Route("api/maintenance-manager")]
    [ApiController]
    public class MaintenanceController : TenantAwareController
    {
        private readonly AppDbContext _context;
        private readonly IAuditService _auditService;

        public MaintenanceController(AppDbContext context, IAuditService auditService)
        {
            _context = context;
            _auditService = auditService;
        }

        private int? GetCurrentUserId()
        {
            var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return string.IsNullOrEmpty(claim) ? null : int.Parse(claim);
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
                // Include legacy rows where record tenant is null but linked asset belongs to tenant.
                query = query.Where(r => r.TenantId == tenantId || (r.TenantId == null && r.Asset != null && r.Asset.TenantId == tenantId));
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

        [HttpGet("allocated-assets")]
        [RequirePermission("Maintenance", "CanView")]
        public async Task<ActionResult<IEnumerable<AllocatedAssetForMaintenanceDto>>> GetAllocatedAssetsForMaintenance()
        {
            var tenantId = GetCurrentTenantId();

            // Same tenant + status rules as AllocationsController.GetActiveAllocations.
            // Do not require Room != null — orphaned FKs or soft issues would hide rows that tenant admin still sees via assets.
            var query = _context.AssetAllocations
                .Include(a => a.Asset)
                    .ThenInclude(asset => asset!.Category)
                .Include(a => a.Room)
                .Where(a => a.Status == "Active" && a.Asset != null && !a.Asset.IsArchived);

            if (!IsSuperAdmin() && tenantId.HasValue)
            {
                // Include legacy rows where allocation tenant is null but linked records are tenant-owned.
                query = query.Where(a =>
                    a.TenantId == tenantId ||
                    (a.TenantId == null && (
                        (a.Asset != null && a.Asset.TenantId == tenantId) ||
                        (a.Room != null && a.Room.TenantId == tenantId)
                    )));
            }

            var allocations = await query
                .OrderByDescending(a => a.AllocatedAt)
                .ToListAsync();

            var result = allocations.Select(a => new AllocatedAssetForMaintenanceDto
            {
                AssetId = a.AssetId,
                AssetCode = a.Asset?.AssetCode,
                AssetName = a.Asset?.AssetName,
                TagNumber = a.Asset?.TagNumber,
                CategoryName = a.Asset?.Category?.CategoryName,
                RoomId = a.RoomId,
                RoomCode = a.Room?.RoomCode,
                RoomName = a.Room?.Name,
                AllocatedAt = a.AllocatedAt,
                TenantId = a.TenantId
            }).ToList();

            return Ok(result);
        }

        // Guid constraint so paths like "allocated-assets" are never captured as an id.
        [HttpGet("{id:guid}")]
        [RequirePermission("Maintenance", "CanView")]
        public async Task<ActionResult<MaintenanceRecordResponseDto>> GetMaintenanceRecord(Guid id)
        {
            var idStr = id.ToString();
            var tenantId = GetCurrentTenantId();
            var record = await _context.MaintenanceRecords
                .Include(r => r.Asset)
                    .ThenInclude(a => a!.Category)
                .FirstOrDefaultAsync(r => r.Id == idStr);

            if (record == null) return NotFound();
            if (!IsSuperAdmin() && tenantId.HasValue && record.TenantId != tenantId) return NotFound();

            var activeAllocation = await _context.AssetAllocations
                .Include(aa => aa.Room)
                .FirstOrDefaultAsync(aa => aa.AssetId == record.AssetId && aa.Status == "Active");

            var allocDict = new Dictionary<string, AssetAllocation>();
            if (activeAllocation != null) allocDict[record.AssetId] = activeAllocation;

            return Ok(MapToDto(record, allocDict));
        }

        // ── Status transition rules ──────────────────────────────
        private static readonly Dictionary<string, string[]> ValidTransitions = new(StringComparer.OrdinalIgnoreCase)
        {
            ["Open"]        = new[] { "Inspection" },
            ["Inspection"]  = new[] { "Quoted", "In Progress" },
            ["Quoted"]      = new[] { "In Progress" },
            ["In Progress"] = new[] { "Completed" },
            ["Scheduled"]   = new[] { "Inspection", "In Progress", "Completed" },
            // Legacy statuses that existing data may have
            ["Pending"]     = new[] { "Open", "Inspection", "In Progress" },
        };

        private static bool IsValidTransition(string from, string to)
        {
            if (string.Equals(from, to, StringComparison.OrdinalIgnoreCase)) return true;
            return ValidTransitions.TryGetValue(from, out var targets)
                && targets.Any(t => string.Equals(t, to, StringComparison.OrdinalIgnoreCase));
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
                DiagnosisOutcome = dto.DiagnosisOutcome,
                InspectionNotes = dto.InspectionNotes,
                QuotationNotes = dto.QuotationNotes,
                DateReported = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                TenantId = IsSuperAdmin() ? null : tenantId,
                IsArchived = false
            };

            _context.MaintenanceRecords.Add(record);

            var userId = GetCurrentUserId();
            _auditService.AddEntry(HttpContext,
                IsSuperAdmin() ? null : tenantId,
                userId,
                null,
                "Maintenance",
                "Create",
                "MaintenanceRecord",
                record.Id,
                $"Maintenance record created ({record.Type}, status {record.Status}) for asset {asset.AssetCode ?? dto.AssetId}.");

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

            // Validate status transition
            if (!IsValidTransition(existing.Status, dto.Status))
                return BadRequest(new { message = $"Cannot transition from '{existing.Status}' to '{dto.Status}'." });

            // Validate AssetId exists and belongs to same tenant
            var asset = await _context.Assets.FindAsync(dto.AssetId);
            if (asset == null) return BadRequest(new { message = "Asset not found." });
            if (!IsSuperAdmin() && tenantId.HasValue && asset.TenantId != tenantId)
                return BadRequest(new { message = "Asset does not belong to your organization." });

            var previousStatus = existing.Status;

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
            existing.DiagnosisOutcome = dto.DiagnosisOutcome;
            existing.InspectionNotes = dto.InspectionNotes;
            existing.QuotationNotes = dto.QuotationNotes;
            existing.UpdatedAt = DateTime.UtcNow;

            _auditService.AddEntry(HttpContext,
                tenantId,
                GetCurrentUserId(),
                null,
                "Maintenance",
                "Update",
                "MaintenanceRecord",
                id,
                $"Maintenance record updated: status {previousStatus} → {dto.Status}.");

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

            _auditService.AddEntry(HttpContext,
                tenantId,
                GetCurrentUserId(),
                null,
                "Maintenance",
                "Archive",
                "MaintenanceRecord",
                id,
                "Maintenance record archived.");

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

            _auditService.AddEntry(HttpContext,
                tenantId,
                GetCurrentUserId(),
                null,
                "Maintenance",
                "Restore",
                "MaintenanceRecord",
                id,
                "Maintenance record restored from archive.");

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

            _auditService.AddEntry(HttpContext,
                tenantId,
                GetCurrentUserId(),
                null,
                "Maintenance",
                "Delete",
                "MaintenanceRecord",
                id,
                "Maintenance record deleted.");

            _context.MaintenanceRecords.Remove(record);
            await _context.SaveChangesAsync();
            return NoContent();
        }

        // ── File Upload ───────────────────────────────────────────

        [HttpPost("upload")]
        [RequirePermission("Maintenance", "CanCreate")]
        public async Task<IActionResult> UploadAttachment(IFormFile file)
        {
            if (file == null || file.Length == 0)
                return BadRequest(new { message = "No file provided." });

            if (file.Length > 10 * 1024 * 1024) // 10MB limit
                return BadRequest(new { message = "File size exceeds 10MB limit." });

            var uploadsDir = Path.Combine(Directory.GetCurrentDirectory(), "uploads", "maintenance");
            Directory.CreateDirectory(uploadsDir);

            var uniqueName = $"{Guid.NewGuid()}{Path.GetExtension(file.FileName)}";
            var filePath = Path.Combine(uploadsDir, uniqueName);

            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            var url = $"/uploads/maintenance/{uniqueName}";
            return Ok(new { url, fileName = file.FileName, size = file.Length });
        }

        // ── Mark Asset Beyond Repair ──────────────────────────────

        [HttpPut("mark-beyond-repair/{maintenanceId}")]
        [RequirePermission("Maintenance", "CanEdit")]
        public async Task<IActionResult> MarkAssetBeyondRepair(string maintenanceId)
        {
            var tenantId = GetCurrentTenantId();
            var record = await _context.MaintenanceRecords
                .Include(r => r.Asset)
                .FirstOrDefaultAsync(r => r.Id == maintenanceId);

            if (record == null) return NotFound();
            if (!IsSuperAdmin() && tenantId.HasValue && record.TenantId != tenantId) return NotFound();

            var asset = record.Asset;
            if (asset == null) return BadRequest(new { message = "Associated asset not found." });

            // Log condition change
            _context.AssetConditionLogs.Add(new AssetConditionLog
            {
                AssetId = asset.Id,
                PreviousCondition = asset.CurrentCondition,
                NewCondition = AssetCondition.Critical,
                Notes = $"Marked as beyond repair from maintenance ticket {record.Id}",
                ChangedBy = User.Identity?.Name ?? "System",
                TenantId = tenantId,
            });

            // Update asset
            asset.LifecycleStatus = LifecycleStatus.ForReplacement;
            asset.CurrentCondition = AssetCondition.Critical;
            asset.UpdatedAt = DateTime.UtcNow;

            // Update maintenance record
            record.DiagnosisOutcome = "Not Repairable";
            record.UpdatedAt = DateTime.UtcNow;

            // Create notification for tenant admin
            _context.Notifications.Add(new Notification
            {
                Message = $"Asset '{asset.AssetName}' ({asset.AssetCode}) has been marked as beyond repair and needs replacement.",
                Type = "Warning",
                Module = "Maintenance",
                EntityType = "Asset",
                EntityId = asset.Id,
                TargetRole = "Admin",
                TenantId = tenantId,
            });

            _auditService.AddEntry(HttpContext,
                tenantId,
                GetCurrentUserId(),
                null,
                "Maintenance",
                "Update",
                "Asset",
                asset.Id,
                $"Repair outcome: not repairable (maintenance ticket {record.Id}). Asset flagged for replacement.");

            await _context.SaveChangesAsync();
            return Ok(new { message = "Asset marked as beyond repair. Admin has been notified." });
        }

        // ── Asset Condition History ───────────────────────────────

        [HttpGet("condition-history/{assetId}")]
        [RequirePermission("Maintenance", "CanView")]
        public async Task<IActionResult> GetAssetConditionHistory(string assetId)
        {
            var tenantId = GetCurrentTenantId();
            var asset = await _context.Assets.FindAsync(assetId);
            if (asset == null) return NotFound();
            if (!IsSuperAdmin() && tenantId.HasValue && asset.TenantId != tenantId) return NotFound();

            var logs = await _context.AssetConditionLogs
                .Where(l => l.AssetId == assetId)
                .OrderByDescending(l => l.CreatedAt)
                .Take(50)
                .Select(l => new
                {
                    l.Id,
                    PreviousCondition = l.PreviousCondition.ToString(),
                    NewCondition = l.NewCondition.ToString(),
                    l.Notes,
                    l.ChangedBy,
                    l.CreatedAt
                })
                .ToListAsync();

            return Ok(logs);
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
                DiagnosisOutcome = r.DiagnosisOutcome,
                InspectionNotes = r.InspectionNotes,
                QuotationNotes = r.QuotationNotes,
                DateReported = r.DateReported,
                IsArchived = r.IsArchived,
                CreatedAt = r.CreatedAt,
                UpdatedAt = r.UpdatedAt,
                TenantId = r.TenantId
            };
        }
    }
}
