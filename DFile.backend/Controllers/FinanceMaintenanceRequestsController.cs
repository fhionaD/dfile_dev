using DFile.backend.Authorization;
using DFile.backend.Constants;
using DFile.backend.Data;
using DFile.backend.DTOs;
using DFile.backend.Models;
using DFile.backend.Services;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
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
        private readonly IMaintenanceReplacementRegistrationService _replacementRegistrationService;

        public FinanceMaintenanceRequestsController(
            AppDbContext context,
            IAuditService auditService,
            INotificationService notificationService,
            IMaintenanceReplacementRegistrationService replacementRegistrationService)
        {
            _context = context;
            _auditService = auditService;
            _notificationService = notificationService;
            _replacementRegistrationService = replacementRegistrationService;
        }

        private int? GetCurrentUserId()
        {
            var claim = User.FindFirst("UserId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return string.IsNullOrEmpty(claim) ? null : int.Parse(claim);
        }

        /// <summary>Finance maintenance APIs are not for pure Maintenance users (UI is Finance/Admin).</summary>
        private ActionResult? ForbidMaintenanceOnFinanceEndpoints()
        {
            if (!IsMaintenanceJwtRole()) return null;
            return new ObjectResult(new { message = "This endpoint is not available for the Maintenance role." })
            {
                StatusCode = StatusCodes.Status403Forbidden,
            };
        }

        private bool IsMaintenanceJwtRole() =>
            string.Equals(User.GetJwtRole() ?? "", UserRoleConstants.Maintenance, StringComparison.OrdinalIgnoreCase);

        private bool IsMaintenanceVisibleToTenant(MaintenanceRecord r, int? tenantId)
        {
            if (IsSuperAdmin()) return true;
            if (!tenantId.HasValue) return false;
            if (r.TenantId == tenantId) return true;
            return r.TenantId == null && r.Asset != null && r.Asset.TenantId == tenantId;
        }

        private async Task<IActionResult?> TrySaveMaintenanceFinanceAsync()
        {
            try
            {
                await _context.SaveChangesAsync();
                return null;
            }
            catch (DbUpdateConcurrencyException)
            {
                return Conflict(new { message = "This maintenance request was modified by another user. Refresh and try again." });
            }
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
        public async Task<ActionResult<IEnumerable<FinanceMaintenanceQueueRowDto>>> GetFinanceMaintenanceQueue()
        {
            var forbid = ForbidMaintenanceOnFinanceEndpoints();
            if (forbid != null) return forbid;

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
            var result = new List<FinanceMaintenanceQueueRowDto>();

            foreach (var r in rows)
            {
                if (!IsMaintenanceVisibleToTenant(r, tenantId)) continue;

                result.Add(MapToFinanceQueueRow(r));
            }

            return Ok(result);
        }

        /// <summary>Repairs approved by Finance but waiting for parts — Finance can mark parts ready from here.</summary>
        [HttpGet("awaiting-parts")]
        [RequirePermission("Assets", "CanView")]
        public async Task<ActionResult<IEnumerable<FinanceMaintenanceQueueRowDto>>> GetRepairsAwaitingParts()
        {
            var forbidAwait = ForbidMaintenanceOnFinanceEndpoints();
            if (forbidAwait != null) return forbidAwait;

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
            var result = new List<FinanceMaintenanceQueueRowDto>();

            foreach (var r in rows)
            {
                if (!IsMaintenanceVisibleToTenant(r, tenantId)) continue;

                result.Add(MapToFinanceQueueRow(r));
            }

            return Ok(result);
        }

        /// <summary>
        /// Returns only Maintenance-submitted fields for Finance (no status/history/frequency noise). Repair vs replacement branches populate different properties.
        /// </summary>
        [HttpGet("{id}/submission-detail")]
        [RequirePermission("Assets", "CanView")]
        public async Task<ActionResult<FinanceMaintenanceSubmissionDetailDto>> GetFinanceSubmissionDetail(string id)
        {
            var forbidDetail = ForbidMaintenanceOnFinanceEndpoints();
            if (forbidDetail != null) return forbidDetail;

            var tenantId = GetCurrentTenantId();
            var record = await _context.MaintenanceRecords
                .AsNoTracking()
                .Include(r => r.Asset)
                    .ThenInclude(a => a!.Category)
                .FirstOrDefaultAsync(r => r.Id == id);

            if (record == null) return NotFound();
            if (!IsMaintenanceVisibleToTenant(record, tenantId)) return NotFound();

            var frt = (record.FinanceRequestType ?? "").Trim();
            if (!string.Equals(frt, "Repair", StringComparison.OrdinalIgnoreCase)
                && !string.Equals(frt, "Replacement", StringComparison.OrdinalIgnoreCase))
                return BadRequest(new { message = "No finance submission is associated with this maintenance record." });

            var activeAllocation = await _context.AssetAllocations
                .AsNoTracking()
                .Include(aa => aa.Room)
                .FirstOrDefaultAsync(aa => aa.AssetId == record.AssetId && aa.Status == "Active");

            var dto = new FinanceMaintenanceSubmissionDetailDto
            {
                Id = record.Id,
                RequestId = record.RequestId,
                FinanceRequestType = string.Equals(frt, "Repair", StringComparison.OrdinalIgnoreCase) ? "Repair" : "Replacement",
                AssetId = record.AssetId,
                AssetName = record.Asset?.AssetName,
                AssetCode = record.Asset?.AssetCode,
                CategoryName = record.Asset?.Category?.CategoryName,
                RoomId = activeAllocation?.RoomId,
                RoomCode = activeAllocation?.Room?.RoomCode,
                RoomName = activeAllocation?.Room?.Name,
            };

            if (string.Equals(frt, "Repair", StringComparison.OrdinalIgnoreCase))
            {
                dto.RepairDescription = string.IsNullOrWhiteSpace(record.QuotationNotes) ? null : record.QuotationNotes.Trim();
                dto.EstimatedRepairCost = record.Cost;
                dto.DamagedPartImageUrls = FilterMaintenanceImageAttachments(record.Attachments);
            }
            else
            {
                dto.NotRepairableExplanation = string.IsNullOrWhiteSpace(record.QuotationNotes) ? null : record.QuotationNotes.Trim();
            }

            return Ok(dto);
        }

        private static List<string> FilterMaintenanceImageAttachments(string? attachmentsCsv)
        {
            if (string.IsNullOrWhiteSpace(attachmentsCsv)) return new List<string>();
            static bool IsImageUrl(string url)
            {
                var u = (url.Split('?', 2)[0] ?? "").ToLowerInvariant();
                return u.EndsWith(".png", StringComparison.Ordinal) || u.EndsWith(".jpg", StringComparison.Ordinal)
                    || u.EndsWith(".jpeg", StringComparison.Ordinal) || u.EndsWith(".gif", StringComparison.Ordinal)
                    || u.EndsWith(".webp", StringComparison.Ordinal) || u.EndsWith(".bmp", StringComparison.Ordinal);
            }

            return attachmentsCsv
                .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Where(IsImageUrl)
                .ToList();
        }

        [HttpPatch("{id}/approve-repair")]
        [RequirePermissionOrRoles("Assets", "CanApprove", "Finance")]
        public async Task<IActionResult> ApproveRepair(string id)
        {
            var forbid = ForbidMaintenanceOnFinanceEndpoints();
            if (forbid != null) return forbid;

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

            var saveApproveRepair = await TrySaveMaintenanceFinanceAsync();
            if (saveApproveRepair != null) return saveApproveRepair;
            return NoContent();
        }

        [HttpPatch("{id}/mark-parts-ready")]
        [RequirePermissionOrRoles("Assets", "CanApprove", "Finance")]
        public async Task<IActionResult> MarkPartsReady(string id)
        {
            var forbid = ForbidMaintenanceOnFinanceEndpoints();
            if (forbid != null) return forbid;

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

            var saveParts = await TrySaveMaintenanceFinanceAsync();
            if (saveParts != null) return saveParts;
            return NoContent();
        }

        [HttpPatch("{id}/reject")]
        [RequirePermissionOrRoles("Assets", "CanApprove", "Finance")]
        public async Task<IActionResult> RejectRequest(string id, [FromBody] FinanceRejectDto? body)
        {
            var forbid = ForbidMaintenanceOnFinanceEndpoints();
            if (forbid != null) return forbid;

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
            record.Priority = "High";
            var reason = body?.Reason?.Trim();
            if (!string.IsNullOrEmpty(reason))
                record.QuotationNotes = string.IsNullOrWhiteSpace(record.QuotationNotes)
                    ? $"[Finance rejected] {reason}"
                    : $"{record.QuotationNotes}\n[Finance rejected] {reason}";
            record.UpdatedAt = DateTime.UtcNow;

            _auditService.AddEntry(HttpContext, tenantId, userId, null, "Finance", "Reject", "MaintenanceRecord", id,
                $"Finance rejected maintenance request {record.RequestId ?? id}.");

            await _notificationService.NotifyMaintenanceFinanceRejectionAsync(record);

            var saveReject = await TrySaveMaintenanceFinanceAsync();
            if (saveReject != null) return saveReject;
            return NoContent();
        }

        [HttpPatch("{id}/approve-replacement")]
        [RequirePermissionOrRoles("Assets", "CanApprove", "Finance")]
        public async Task<IActionResult> ApproveReplacement(string id)
        {
            var forbid = ForbidMaintenanceOnFinanceEndpoints();
            if (forbid != null) return forbid;

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

            asset.LifecycleStatus = LifecycleStatus.ForReplacement;
            asset.UpdatedAt = DateTime.UtcNow;
            asset.UpdatedBy = userId;
            var pendingNote =
                $"[Replacement approved {DateTime.UtcNow:yyyy-MM-dd} UTC] Awaiting replacement asset registration. Request {record.RequestId ?? id}.";
            asset.Notes = string.IsNullOrWhiteSpace(asset.Notes)
                ? pendingNote
                : $"{asset.Notes.Trim()}\n{pendingNote}";

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
                $"Finance approved replacement for {record.RequestId ?? id}; original asset marked for replacement pending new asset registration.");

            var saveReplacement = await TrySaveMaintenanceFinanceAsync();
            if (saveReplacement != null) return saveReplacement;
            return NoContent();
        }

        [HttpPost("{id}/complete-replacement")]
        [RequirePermissionOrRoles("Assets", "CanApprove", "Finance")]
        public async Task<ActionResult<object>> CompleteReplacement(string id, [FromBody] CompleteReplacementAssetDto dto)
        {
            var forbid = ForbidMaintenanceOnFinanceEndpoints();
            if (forbid != null) return forbid;

            if (!ModelState.IsValid)
            {
                var errors = ModelState
                    .Where(kv => kv.Value?.Errors.Count > 0)
                    .ToDictionary(kv => kv.Key, kv => kv.Value!.Errors.Select(e => e.ErrorMessage).ToArray());
                return BadRequest(new { message = "Validation failed.", errors });
            }

            var tenantId = GetCurrentTenantId();
            var userId = GetCurrentUserId();

            var createDto = new CreateAssetDto
            {
                AssetName = dto.AssetName.Trim(),
                CategoryId = dto.CategoryId,
                SerialNumber = dto.SerialNumber,
                AcquisitionCost = dto.Cost,
                PurchasePrice = dto.Cost,
                UsefulLifeYears = 5,
                PurchaseDate = dto.DateOfAcquisition,
                Documents = string.IsNullOrWhiteSpace(dto.Documentation) ? null : dto.Documentation.Trim(),
                CurrentCondition = AssetCondition.Good,
                LifecycleStatus = LifecycleStatus.Registered,
            };

            var outcome = await _replacementRegistrationService.RegisterReplacementAssetAsync(
                createDto,
                id,
                tenantId,
                userId,
                IsSuperAdmin());

            if (!outcome.Success)
                return StatusCode(outcome.StatusCode, new { message = outcome.ErrorMessage });

            var newAsset = outcome.NewAsset!;
            _auditService.AddEntry(HttpContext, tenantId, userId, null, "Finance", "Create", "Asset", newAsset.Id,
                $"Registered replacement asset for maintenance {id}.");

            return Ok(new { assetId = newAsset.Id, assetCode = newAsset.AssetCode, maintenanceRecordId = id });
        }

        private static FinanceMaintenanceQueueRowDto MapToFinanceQueueRow(MaintenanceRecord r) => new()
        {
            Id = r.Id,
            RequestId = r.RequestId,
            AssetId = r.AssetId,
            AssetName = r.Asset?.AssetName,
            AssetCode = r.Asset?.AssetCode,
            Status = r.Status,
            FinanceRequestType = r.FinanceRequestType,
            FinanceWorkflowStatus = r.FinanceWorkflowStatus,
            DiagnosisOutcome = r.DiagnosisOutcome,
            LinkedPurchaseOrderId = r.LinkedPurchaseOrderId,
            Cost = r.Cost,
        };
    }

    public class FinanceRejectDto
    {
        public string? Reason { get; set; }
    }
}
