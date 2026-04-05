using DFile.backend.Authorization;
using DFile.backend.Data;
using DFile.backend.DTOs;
using DFile.backend.Models;
using DFile.backend.Services;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace DFile.backend.Controllers
{
    /// <summary>Finance visibility and actions for maintenance-originated repair/replacement requests.</summary>
    [Authorize]
    [Route("api/finance/maintenance-requests")]
    [ApiController]
    public class FinanceMaintenanceRequestsController : TenantAwareController
    {
        private readonly AppDbContext _context;
        private readonly IAuditService _auditService;
        private readonly INotificationService _notificationService;

        public FinanceMaintenanceRequestsController(
            AppDbContext context,
            IAuditService auditService,
            INotificationService notificationService)
        {
            _context = context;
            _auditService = auditService;
            _notificationService = notificationService;
        }

        private int? GetCurrentUserId()
        {
            var claim = User.FindFirst("UserId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return string.IsNullOrEmpty(claim) ? null : int.Parse(claim);
        }

        private bool IsMaintenanceVisibleToTenant(MaintenanceRecord r, int? tenantId)
        {
            if (IsSuperAdmin()) return true;
            if (!tenantId.HasValue) return false;
            if (r.TenantId == tenantId) return true;
            return r.TenantId == null && r.Asset != null && r.Asset.TenantId == tenantId;
        }

        private async Task CloseActiveAllocationsForAssetAsync(string assetId, int? userId)
        {
            var allocs = await _context.AssetAllocations
                .Where(a => a.AssetId == assetId && a.Status == "Active")
                .ToListAsync();
            foreach (var a in allocs)
            {
                a.Status = "Inactive";
                a.DeallocatedAt = DateTime.UtcNow;
                a.DeallocatedBy = userId;
            }
        }

        [HttpGet]
        [RequirePermission("Assets", "CanView")]
        public async Task<ActionResult<IEnumerable<MaintenanceRecordResponseDto>>> GetFinanceMaintenanceQueue()
        {
            var tenantId = GetCurrentTenantId();
            // Actionable queue only — hide completed / approved / rejected / replacement-completed rows.
            var query = _context.MaintenanceRecords
                .AsNoTracking()
                .Include(r => r.Asset)
                    .ThenInclude(a => a!.Category)
                .Where(r =>
                    r.FinanceWorkflowStatus == "Pending Approval" ||
                    r.FinanceWorkflowStatus == "Waiting for Replacement");

            if (!IsSuperAdmin() && tenantId.HasValue)
            {
                query = query.Where(r =>
                    r.TenantId == tenantId ||
                    (r.TenantId == null && r.Asset != null && r.Asset.TenantId == tenantId));
            }

            var rows = await query.OrderByDescending(r => r.UpdatedAt).ToListAsync();
            var utcNow = DateTime.UtcNow;
            var result = new List<MaintenanceRecordResponseDto>();

            foreach (var r in rows)
            {
                if (!IsMaintenanceVisibleToTenant(r, tenantId)) continue;

                var activeAllocation = await _context.AssetAllocations
                    .Include(aa => aa.Room)
                    .FirstOrDefaultAsync(aa => aa.AssetId == r.AssetId && aa.Status == "Active");
                var allocDict = new Dictionary<string, AssetAllocation>();
                if (activeAllocation != null) allocDict[r.AssetId] = activeAllocation;

                result.Add(MaintenanceControllerMapHelper.MapToDto(r, allocDict, utcNow));
            }

            return Ok(result);
        }

        /// <summary>Repairs approved by Finance but waiting for parts — Finance can mark parts ready from here.</summary>
        [HttpGet("awaiting-parts")]
        [RequirePermission("Assets", "CanView")]
        public async Task<ActionResult<IEnumerable<MaintenanceRecordResponseDto>>> GetRepairsAwaitingParts()
        {
            var tenantId = GetCurrentTenantId();
            var query = _context.MaintenanceRecords
                .AsNoTracking()
                .Include(r => r.Asset)
                    .ThenInclude(a => a!.Category)
                // Use direct equality — EF Core cannot translate string.Equals(..., StringComparison) to SQL.
                .Where(r =>
                    r.Status == "In Progress" &&
                    r.FinanceRequestType == "Repair" &&
                    r.FinanceWorkflowStatus == "Approved");

            if (!IsSuperAdmin() && tenantId.HasValue)
            {
                query = query.Where(r =>
                    r.TenantId == tenantId ||
                    (r.TenantId == null && r.Asset != null && r.Asset.TenantId == tenantId));
            }

            var rows = await query.OrderByDescending(r => r.UpdatedAt).ToListAsync();
            var utcNow = DateTime.UtcNow;
            var result = new List<MaintenanceRecordResponseDto>();

            foreach (var r in rows)
            {
                if (!IsMaintenanceVisibleToTenant(r, tenantId)) continue;

                var activeAllocation = await _context.AssetAllocations
                    .Include(aa => aa.Room)
                    .FirstOrDefaultAsync(aa => aa.AssetId == r.AssetId && aa.Status == "Active");
                var allocDict = new Dictionary<string, AssetAllocation>();
                if (activeAllocation != null) allocDict[r.AssetId] = activeAllocation;

                result.Add(MaintenanceControllerMapHelper.MapToDto(r, allocDict, utcNow));
            }

            return Ok(result);
        }

        [HttpPatch("{id}/approve-repair")]
        [RequirePermissionOrRoles("Assets", "CanApprove", "Finance")]
        public async Task<IActionResult> ApproveRepair(string id)
        {
            var tenantId = GetCurrentTenantId();
            var userId = GetCurrentUserId();
            var record = await _context.MaintenanceRecords.Include(r => r.Asset).FirstOrDefaultAsync(r => r.Id == id);
            if (record == null) return NotFound();
            if (!IsMaintenanceVisibleToTenant(record, tenantId)) return NotFound();

            if (!string.Equals(record.Status, "Finance Review", StringComparison.OrdinalIgnoreCase)
                || !string.Equals(record.FinanceRequestType, "Repair", StringComparison.OrdinalIgnoreCase))
                return BadRequest(new { message = "This record is not a repair request awaiting finance approval." });

            if (!string.Equals(record.FinanceWorkflowStatus, "Pending Approval", StringComparison.OrdinalIgnoreCase))
                return BadRequest(new { message = $"Invalid finance workflow state: {record.FinanceWorkflowStatus ?? "(none)"}." });

            record.Status = "In Progress";
            record.FinanceWorkflowStatus = "Approved";
            record.UpdatedAt = DateTime.UtcNow;

            _auditService.AddEntry(HttpContext, tenantId, userId, null, "Finance", "Approve", "MaintenanceRecord", id,
                $"Finance approved repair request {record.RequestId ?? id}; maintenance may proceed after parts are available.");

            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpPatch("{id}/mark-parts-ready")]
        [RequirePermissionOrRoles("Assets", "CanApprove", "Finance")]
        public async Task<IActionResult> MarkPartsReady(string id)
        {
            var tenantId = GetCurrentTenantId();
            var userId = GetCurrentUserId();
            var record = await _context.MaintenanceRecords.Include(r => r.Asset).FirstOrDefaultAsync(r => r.Id == id);
            if (record == null) return NotFound();
            if (!IsMaintenanceVisibleToTenant(record, tenantId)) return NotFound();

            if (!string.Equals(record.Status, "In Progress", StringComparison.OrdinalIgnoreCase)
                || !string.Equals(record.FinanceRequestType, "Repair", StringComparison.OrdinalIgnoreCase)
                || !string.Equals(record.FinanceWorkflowStatus, "Approved", StringComparison.OrdinalIgnoreCase))
                return BadRequest(new { message = "Parts can only be marked ready for an approved repair that is in progress." });

            record.FinanceWorkflowStatus = "Parts Ready";
            record.UpdatedAt = DateTime.UtcNow;

            await _notificationService.NotifyMaintenancePartsReadyAsync(record);
            _auditService.AddEntry(HttpContext, tenantId, userId, null, "Finance", "Update", "MaintenanceRecord", id,
                $"Finance marked parts ready for {record.RequestId ?? id}.");

            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpPatch("{id}/reject")]
        [RequirePermissionOrRoles("Assets", "CanApprove", "Finance")]
        public async Task<IActionResult> RejectRequest(string id, [FromBody] FinanceRejectDto? body)
        {
            var tenantId = GetCurrentTenantId();
            var userId = GetCurrentUserId();
            var record = await _context.MaintenanceRecords.Include(r => r.Asset).FirstOrDefaultAsync(r => r.Id == id);
            if (record == null) return NotFound();
            if (!IsMaintenanceVisibleToTenant(record, tenantId)) return NotFound();

            if (!string.Equals(record.Status, "Finance Review", StringComparison.OrdinalIgnoreCase))
                return BadRequest(new { message = "Only requests in Finance Review can be rejected from this queue." });

            if (!string.Equals(record.FinanceWorkflowStatus, "Pending Approval", StringComparison.OrdinalIgnoreCase))
                return BadRequest(new { message = $"Invalid finance workflow state: {record.FinanceWorkflowStatus ?? "(none)"}." });

            record.Status = "Inspection";
            record.FinanceWorkflowStatus = "Rejected";
            var reason = body?.Reason?.Trim();
            if (!string.IsNullOrEmpty(reason))
                record.QuotationNotes = string.IsNullOrWhiteSpace(record.QuotationNotes)
                    ? $"[Finance rejected] {reason}"
                    : $"{record.QuotationNotes}\n[Finance rejected] {reason}";
            record.UpdatedAt = DateTime.UtcNow;

            _auditService.AddEntry(HttpContext, tenantId, userId, null, "Finance", "Reject", "MaintenanceRecord", id,
                $"Finance rejected maintenance request {record.RequestId ?? id}.");

            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpPatch("{id}/approve-replacement")]
        [RequirePermissionOrRoles("Assets", "CanApprove", "Finance")]
        public async Task<IActionResult> ApproveReplacement(string id)
        {
            var tenantId = GetCurrentTenantId();
            var userId = GetCurrentUserId();
            var record = await _context.MaintenanceRecords
                .Include(r => r.Asset)
                .FirstOrDefaultAsync(r => r.Id == id);
            if (record == null) return NotFound();
            if (!IsMaintenanceVisibleToTenant(record, tenantId)) return NotFound();

            if (!string.Equals(record.Status, "Finance Review", StringComparison.OrdinalIgnoreCase)
                || !string.Equals(record.FinanceRequestType, "Replacement", StringComparison.OrdinalIgnoreCase))
                return BadRequest(new { message = "This record is not a replacement request awaiting finance approval." });

            if (!string.Equals(record.FinanceWorkflowStatus, "Pending Approval", StringComparison.OrdinalIgnoreCase))
                return BadRequest(new { message = $"Invalid finance workflow state: {record.FinanceWorkflowStatus ?? "(none)"}." });

            var asset = record.Asset;
            if (asset == null) return BadRequest(new { message = "Associated asset not found." });

            asset.LifecycleStatus = LifecycleStatus.Disposed;
            asset.UpdatedAt = DateTime.UtcNow;
            asset.UpdatedBy = userId;

            await CloseActiveAllocationsForAssetAsync(asset.Id, userId);

            if (!string.IsNullOrWhiteSpace(record.LinkedPurchaseOrderId))
            {
                var po = await _context.PurchaseOrders.FindAsync(record.LinkedPurchaseOrderId);
                if (po != null && string.Equals(po.Status, "Pending", StringComparison.OrdinalIgnoreCase))
                {
                    po.Status = "Approved";
                    po.ApprovedBy = userId;
                    po.ApprovedAt = DateTime.UtcNow;
                    po.UpdatedAt = DateTime.UtcNow;
                }
            }

            record.Status = "Waiting for Replacement";
            record.FinanceWorkflowStatus = "Waiting for Replacement";
            record.UpdatedAt = DateTime.UtcNow;

            _auditService.AddEntry(HttpContext, tenantId, userId, null, "Finance", "Approve", "MaintenanceRecord", id,
                $"Finance approved replacement for {record.RequestId ?? id}; original asset disposed.");

            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpPost("{id}/complete-replacement")]
        [RequirePermissionOrRoles("Assets", "CanApprove", "Finance")]
        public async Task<ActionResult<object>> CompleteReplacement(string id, [FromBody] CompleteReplacementAssetDto dto)
        {
            if (!ModelState.IsValid)
            {
                var errors = ModelState
                    .Where(kv => kv.Value?.Errors.Count > 0)
                    .ToDictionary(kv => kv.Key, kv => kv.Value!.Errors.Select(e => e.ErrorMessage).ToArray());
                return BadRequest(new { message = "Validation failed.", errors });
            }

            var tenantId = GetCurrentTenantId();
            var userId = GetCurrentUserId();
            var record = await _context.MaintenanceRecords.Include(r => r.Asset).FirstOrDefaultAsync(r => r.Id == id);
            if (record == null) return NotFound();
            if (!IsMaintenanceVisibleToTenant(record, tenantId)) return NotFound();

            if (!string.Equals(record.Status, "Waiting for Replacement", StringComparison.OrdinalIgnoreCase)
                || !string.Equals(record.FinanceWorkflowStatus, "Waiting for Replacement", StringComparison.OrdinalIgnoreCase))
                return BadRequest(new { message = "Replacement can only be completed when status is Waiting for Replacement." });

            var effectiveTenantId = IsSuperAdmin() ? null : tenantId;
            var category = await _context.AssetCategories.FindAsync(dto.CategoryId);
            if (category == null || category.IsArchived)
                return BadRequest(new { message = "Invalid or archived asset category." });

            if (dto.DateOfAcquisition.HasValue && dto.DateOfAcquisition.Value.Date > DateTime.UtcNow.Date)
                return BadRequest(new { message = "Date of acquisition cannot be in the future." });

            var normalizedSerial = string.IsNullOrWhiteSpace(dto.SerialNumber) ? null : dto.SerialNumber.Trim();
            if (!string.IsNullOrEmpty(normalizedSerial))
            {
                var serialExists = await _context.Assets.AnyAsync(a =>
                    a.SerialNumber != null &&
                    a.SerialNumber.ToUpper() == normalizedSerial.ToUpper() &&
                    ((effectiveTenantId == null && a.TenantId == null) || a.TenantId == effectiveTenantId));
                if (serialExists)
                    return Conflict(new { message = "Serial number already exists for an asset in this organization." });
            }

            var purchasePrice = dto.Cost;
            var effectiveSalvagePct = category.SalvagePercentage;
            var computedSalvageValue = Math.Round(purchasePrice * effectiveSalvagePct / 100m, 2);
            var usefulLife = 5;

            var newAsset = new Asset
            {
                Id = Guid.NewGuid().ToString(),
                AssetCode = await RecordCodeGenerator.GenerateAssetCodeAsync(_context, effectiveTenantId),
                TagNumber = await RecordCodeGenerator.GenerateTagNumberAsync(_context),
                AssetName = dto.AssetName.Trim(),
                CategoryId = dto.CategoryId,
                LifecycleStatus = LifecycleStatus.Registered,
                CurrentCondition = AssetCondition.Good,
                HandlingTypeSnapshot = category.HandlingType.ToString(),
                SerialNumber = normalizedSerial,
                PurchaseDate = dto.DateOfAcquisition,
                AcquisitionCost = purchasePrice,
                UsefulLifeYears = usefulLife,
                PurchasePrice = purchasePrice,
                SalvagePercentage = effectiveSalvagePct,
                SalvageValue = computedSalvageValue,
                CurrentBookValue = purchasePrice,
                MonthlyDepreciation = usefulLife > 0 ? Math.Round(purchasePrice / (usefulLife * 12), 2) : 0,
                DepreciationMonthsApplied = 0,
                TenantId = effectiveTenantId,
                Documents = string.IsNullOrWhiteSpace(dto.Documentation) ? null : dto.Documentation.Trim(),
                Notes = $"Replacement asset for maintenance request {record.RequestId ?? record.Id}.",
                IsArchived = false,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                CreatedBy = userId,
                UpdatedBy = userId
            };

            _context.Assets.Add(newAsset);

            record.ReplacementRegisteredAssetId = newAsset.Id;
            record.Status = "Completed";
            record.FinanceWorkflowStatus = "Replacement Completed";
            record.UpdatedAt = DateTime.UtcNow;

            _auditService.AddEntry(HttpContext, tenantId, userId, null, "Finance", "Create", "Asset", newAsset.Id,
                $"Registered replacement asset for maintenance {record.RequestId ?? id}.");

            await _notificationService.NotifyAdminReplacementAssetRegisteredAsync(record, newAsset);

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException ex) when (ex.InnerException is SqlException sqlEx && (sqlEx.Number == 2601 || sqlEx.Number == 2627))
            {
                return Conflict(new { message = "Could not save asset (duplicate key). Check serial number." });
            }

            return Ok(new { assetId = newAsset.Id, assetCode = newAsset.AssetCode, maintenanceRecordId = record.Id });
        }
    }

    /// <summary>Shared DTO mapping for finance list responses (mirrors MaintenanceController private MapToDto).</summary>
    internal static class MaintenanceControllerMapHelper
    {
        public static MaintenanceRecordResponseDto MapToDto(MaintenanceRecord r, Dictionary<string, AssetAllocation> activeAllocations, DateTime utcNow)
        {
            activeAllocations.TryGetValue(r.AssetId, out var alloc);

            return new MaintenanceRecordResponseDto
            {
                Id = r.Id,
                RequestId = r.RequestId,
                AssetId = r.AssetId,
                AssetName = r.Asset?.AssetName,
                AssetCode = r.Asset?.AssetCode,
                TagNumber = r.Asset?.TagNumber,
                CategoryName = r.Asset?.Category?.CategoryName,
                RoomId = alloc?.Room?.Id,
                RoomCode = alloc?.Room?.RoomCode,
                RoomName = alloc?.Room?.Name,
                RoomFloor = alloc?.Room != null && !string.IsNullOrWhiteSpace(alloc.Room.Floor) ? alloc.Room.Floor.Trim() : null,
                Description = r.Description,
                Status = r.Status,
                Priority = r.Priority,
                Type = r.Type,
                Frequency = r.Frequency,
                StartDate = r.StartDate,
                EndDate = r.EndDate,
                NextDueDate = MaintenanceSchedulingService.ComputeNextDueDate(r, utcNow),
                Cost = r.Cost,
                Attachments = r.Attachments,
                DiagnosisOutcome = r.DiagnosisOutcome,
                InspectionNotes = r.InspectionNotes,
                QuotationNotes = r.QuotationNotes,
                DateReported = r.DateReported,
                IsArchived = r.IsArchived,
                CreatedAt = r.CreatedAt,
                UpdatedAt = r.UpdatedAt,
                TenantId = r.TenantId,
                FinanceRequestType = r.FinanceRequestType,
                FinanceWorkflowStatus = r.FinanceWorkflowStatus,
                LinkedPurchaseOrderId = r.LinkedPurchaseOrderId,
                ReplacementRegisteredAssetId = r.ReplacementRegisteredAssetId,
                ScheduleSeriesId = r.ScheduleSeriesId,
            };
        }
    }

    public class FinanceRejectDto
    {
        public string? Reason { get; set; }
    }
}
