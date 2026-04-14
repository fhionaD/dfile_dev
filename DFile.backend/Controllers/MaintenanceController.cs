using DFile.backend.Authorization;
using DFile.backend.Constants;
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
        private readonly INotificationService _notificationService;

        public MaintenanceController(AppDbContext context, IAuditService auditService, INotificationService notificationService)
        {
            _context = context;
            _auditService = auditService;
            _notificationService = notificationService;
        }

        private int? GetCurrentUserId()
        {
            var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return string.IsNullOrEmpty(claim) ? null : int.Parse(claim);
        }

        /// <summary>
        /// JWT may surface the role as short claim "role" or as ClaimTypes.Role depending on handler settings.
        /// </summary>
        private static bool IsAdminOrSuperAdminCreator(ClaimsPrincipal user)
        {
            if (user.IsInRole(UserRoleConstants.Admin) || user.IsInRole(UserRoleConstants.SuperAdmin))
                return true;
            var r = user.GetJwtRole();
            return string.Equals(r, UserRoleConstants.Admin, StringComparison.OrdinalIgnoreCase)
                || string.Equals(r, UserRoleConstants.SuperAdmin, StringComparison.OrdinalIgnoreCase);
        }

        [HttpGet]
        [RequirePermission("Maintenance", "CanView")]
        public async Task<ActionResult<IEnumerable<MaintenanceRecordResponseDto>>> GetMaintenanceRecords([FromQuery] bool showArchived = false)
        {
            var tenantId = GetCurrentTenantId();
            // Project in SQL: avoids materializing full Asset + Category graphs and reduces memory/IO.
            var query = _context.MaintenanceRecords
                .AsNoTracking()
                .Where(r => r.IsArchived == showArchived);

            if (!IsSuperAdmin() && tenantId.HasValue)
            {
                // Include legacy rows where record tenant is null but linked asset belongs to tenant.
                query = query.Where(r =>
                    r.TenantId == tenantId ||
                    (r.TenantId == null && r.Asset != null && r.Asset.TenantId == tenantId));
            }

            var rows = await query
                .OrderByDescending(r => r.CreatedAt)
                .Select(r => new MaintenanceRecordListRow(
                    r.Id,
                    r.RequestId,
                    r.AssetId,
                    r.Asset != null ? r.Asset.AssetName : null,
                    r.Asset != null ? r.Asset.AssetCode : null,
                    r.Asset != null && r.Asset.Category != null ? r.Asset.Category.CategoryName : null,
                    r.Description,
                    r.Status,
                    r.Priority,
                    r.Type,
                    r.Frequency,
                    r.StartDate,
                    r.EndDate,
                    r.Cost,
                    r.Attachments,
                    r.DiagnosisOutcome,
                    r.InspectionNotes,
                    r.QuotationNotes,
                    r.DateReported,
                    r.IsArchived,
                    r.CreatedAt,
                    r.UpdatedAt,
                    r.TenantId,
                    r.FinanceRequestType,
                    r.FinanceWorkflowStatus,
                    r.LinkedPurchaseOrderId,
                    r.ReplacementRegisteredAssetId,
                    r.ScheduleSeriesId))
                .ToListAsync();

            var assetIds = rows.Select(r => r.AssetId).Distinct().ToList();
            // Chunk IN lists: very large tenant lists can hit SQL Server parameter limits and degrade plans.
            const int allocChunkSize = 900;
            var roomByAsset = new Dictionary<string, (string? RoomId, string? RoomCode, string? RoomName, string? RoomFloor)>(StringComparer.Ordinal);
            for (var off = 0; off < assetIds.Count; off += allocChunkSize)
            {
                var chunk = assetIds.Skip(off).Take(allocChunkSize).ToList();
                var allocationRows = await _context.AssetAllocations
                    .AsNoTracking()
                    .Where(aa => chunk.Contains(aa.AssetId) && aa.Status == "Active")
                    .Select(aa => new
                    {
                        aa.AssetId,
                        aa.RoomId,
                        RoomCode = aa.Room != null ? aa.Room.RoomCode : null,
                        RoomName = aa.Room != null ? aa.Room.Name : null,
                        RoomFloor = aa.Room != null && !string.IsNullOrWhiteSpace(aa.Room.Floor) ? aa.Room.Floor.Trim() : null
                    })
                    .ToListAsync();

                foreach (var a in allocationRows)
                {
                    if (roomByAsset.ContainsKey(a.AssetId)) continue;
                    roomByAsset[a.AssetId] = (a.RoomId, a.RoomCode, a.RoomName, a.RoomFloor);
                }
            }

            var utcNow = DateTime.UtcNow;
            var result = rows.Select(r => MapListRowToDto(r, roomByAsset, utcNow)).ToList();
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
                TagNumber = null,
                CategoryName = a.Asset?.Category?.CategoryName,
                RoomId = a.RoomId,
                RoomCode = a.Room?.RoomCode,
                RoomName = a.Room?.Name,
                AllocatedAt = a.AllocatedAt,
                TenantId = a.TenantId
            }).ToList();

            return Ok(result);
        }

        /// <summary>Completed on-site repairs (persisted via AssetConditionLogs with MaintenanceRecordId).</summary>
        [HttpGet("repair-history")]
        [RequirePermission("Maintenance", "CanView")]
        public async Task<ActionResult<IEnumerable<object>>> GetRepairHistory([FromQuery] string? assetId = null)
        {
            var tenantId = GetCurrentTenantId();
            var q =
                from log in _context.AssetConditionLogs.AsNoTracking()
                join asset in _context.Assets.AsNoTracking() on log.AssetId equals asset.Id
                join maint in _context.MaintenanceRecords.AsNoTracking() on log.MaintenanceRecordId equals maint.Id into maintJoin
                from maint in maintJoin.DefaultIfEmpty()
                where log.MaintenanceRecordId != null
                select new { log, asset, maint };

            if (!IsSuperAdmin() && tenantId.HasValue)
                q = q.Where(x => x.asset.TenantId == tenantId);

            if (!string.IsNullOrWhiteSpace(assetId))
            {
                var aid = assetId.Trim();
                q = q.Where(x => x.log.AssetId == aid);
            }

            var rows = await q
                .OrderByDescending(x => x.log.CreatedAt)
                .Take(200)
                .Select(x => new
                {
                    x.log.Id,
                    maintenanceRecordId = x.log.MaintenanceRecordId,
                    requestId = x.maint != null ? x.maint.RequestId : null,
                    x.log.AssetId,
                    assetName = x.asset.AssetName,
                    assetCode = x.asset.AssetCode,
                    x.log.Notes,
                    previousCondition = x.log.PreviousCondition.ToString(),
                    newCondition = x.log.NewCondition.ToString(),
                    x.log.ChangedBy,
                    x.log.CreatedAt,
                })
                .ToListAsync();

            return Ok(rows);
        }

        /// <summary>Schedule-only fields for calendar / schedule UI (excludes execution, finance, quotation, attachments).</summary>
        [HttpGet("{id:guid}/schedule-summary")]
        [RequirePermission("Maintenance", "CanView")]
        public async Task<ActionResult<MaintenanceScheduleSummaryDto>> GetMaintenanceScheduleSummary(Guid id)
        {
            var idStr = id.ToString();
            var tenantId = GetCurrentTenantId();
            var record = await _context.MaintenanceRecords
                .Include(r => r.Asset)
                    .ThenInclude(a => a!.Category)
                .FirstOrDefaultAsync(r => r.Id == idStr);

            if (record == null) return NotFound();
            if (!IsMaintenanceVisibleToTenant(record, tenantId)) return NotFound();

            var activeAllocation = await _context.AssetAllocations
                .Include(aa => aa.Room)
                .FirstOrDefaultAsync(aa => aa.AssetId == record.AssetId && aa.Status == "Active");

            var allocDict = new Dictionary<string, AssetAllocation>();
            if (activeAllocation != null) allocDict[record.AssetId] = activeAllocation;

            return Ok(MapToScheduleSummaryDto(record, allocDict, DateTime.UtcNow));
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
            if (!IsMaintenanceVisibleToTenant(record, tenantId)) return NotFound();

            var activeAllocation = await _context.AssetAllocations
                .Include(aa => aa.Room)
                .FirstOrDefaultAsync(aa => aa.AssetId == record.AssetId && aa.Status == "Active");

            var allocDict = new Dictionary<string, AssetAllocation>();
            if (activeAllocation != null) allocDict[record.AssetId] = activeAllocation;

            return Ok(MapToDto(record, allocDict, DateTime.UtcNow));
        }

        // ── Status transition rules ──────────────────────────────
        private static readonly Dictionary<string, string[]> ValidTransitions = new(StringComparer.OrdinalIgnoreCase)
        {
            // Finance Review may only be entered via POST inspection-workflow or from Inspection/Quoted — not directly from Pending/Open/Scheduled.
            ["Open"]        = new[] { "Inspection" },
            ["Inspection"]  = new[] { "Quoted", "In Progress", "Completed", "Finance Review" },
            ["Quoted"]      = new[] { "In Progress", "Finance Review" },
            ["In Progress"] = new[] { "Completed" },
            ["Scheduled"]   = new[] { "Inspection", "In Progress", "Completed" },
            ["Pending"]     = new[] { "Open", "Inspection", "In Progress" },
            ["Finance Review"] = new[] { "Completed", "Waiting for Replacement", "Inspection", "Quoted", "In Progress" },
            ["Waiting for Replacement"] = new[] { "Completed" },
        };

        private static bool IsValidTransition(string from, string to)
        {
            if (string.Equals(from, to, StringComparison.OrdinalIgnoreCase)) return true;
            return ValidTransitions.TryGetValue(from, out var targets)
                && targets.Any(t => string.Equals(t, to, StringComparison.OrdinalIgnoreCase));
        }

        [HttpPost]
        [RequirePermission("Maintenance", "CanCreate")]
        public async Task<IActionResult> PostMaintenanceRecord(CreateMaintenanceRecordDto dto)
        {
            if (!ModelState.IsValid)
            {
                var errors = ModelState
                    .Where(kv => kv.Value?.Errors.Count > 0)
                    .ToDictionary(kv => kv.Key, kv => kv.Value!.Errors.Select(e => e.ErrorMessage).ToArray());
                return BadRequest(new { message = "Validation failed.", errors });
            }

            dto.Description = (dto.Description ?? "").Trim();
            dto.AssetId = (dto.AssetId ?? "").Trim();
            var hasScheduleFrequency = !string.IsNullOrWhiteSpace(dto.Frequency);
            if (!hasScheduleFrequency && string.IsNullOrWhiteSpace(dto.Description))
                return BadRequest(new { message = "Description is required when no schedule frequency is set." });
            if (string.IsNullOrWhiteSpace(dto.AssetId))
                return BadRequest(new { message = "AssetId is required." });
            if (!dto.StartDate.HasValue)
                return BadRequest(new { message = "Start date is required." });

            var tenantId = GetCurrentTenantId();

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

            var activeAlloc = await _context.AssetAllocations.AsNoTracking()
                .FirstOrDefaultAsync(aa => aa.AssetId == dto.AssetId && aa.Status == "Active");
            var allocErr = ValidateActiveAllocationAndOptionalRoom(dto.RoomId, activeAlloc);
            if (allocErr != null) return allocErr;

            var scheduleErr = MaintenanceSchedulingService.ValidateSchedule(dto.Frequency, dto.StartDate, dto.EndDate);
            if (scheduleErr != null)
                return BadRequest(new { message = scheduleErr });

            var seriesKey = string.IsNullOrWhiteSpace(dto.ScheduleSeriesId) ? null : dto.ScheduleSeriesId.Trim();
            if (seriesKey != null && await _context.MaintenanceRecords.AsNoTracking().AnyAsync(m => m.ScheduleSeriesId == seriesKey))
                return Conflict(new { message = "This schedule batch was already created." });

            var rangeEnd = dto.EndDate ?? dto.StartDate.Value;
            var occurrenceDates = MaintenanceSchedulingService.GenerateInclusiveOccurrenceDatesUtc(
                dto.StartDate.Value,
                rangeEnd,
                dto.Frequency);

            if (occurrenceDates.Count == 0)
                return BadRequest(new { message = "No schedule dates could be generated for the given range." });

            const int maxBatch = 400;
            if (occurrenceDates.Count > maxBatch)
                return BadRequest(new { message = $"Too many occurrences ({occurrenceDates.Count}). Maximum is {maxBatch}." });

            // Check for duplicate inspection dates: if any occurrence date already has a maintenance record for this asset
            var dateSet = occurrenceDates.Select(d => d.Date).ToHashSet();
            var existingRecordsForAsset = await _context.MaintenanceRecords.AsNoTracking()
                .Where(m => m.AssetId == dto.AssetId && !m.IsArchived)
                .Select(m => m.StartDate)
                .ToListAsync();
            
            var duplicateDates = existingRecordsForAsset
                .Where(d => d.HasValue)
                .Select(d => d!.Value)
                .Where(d => dateSet.Contains(d.Date))
                .ToList();
            
            if (duplicateDates.Any())
            {
                var duplicateDateStr = duplicateDates.First().ToString("yyyy-MM-dd");
                return Conflict(new { message = $"Maintenance is already scheduled for this asset on {duplicateDateStr}. Please select different dates." });
            }

            // Recurring: series id groups occurrences. One-off: still persist client scheduleSeriesId when supplied
            // so duplicate-batch detection (conflict above) matches stored rows.
            string? persistedSeriesId = MaintenanceSchedulingService.IsRecurring(dto.Frequency)
                ? (seriesKey ?? Guid.NewGuid().ToString("N"))
                : seriesKey;

            var created = new List<MaintenanceRecord>();
            var now = DateTime.UtcNow;
            foreach (var occ in occurrenceDates)
            {
                var requestId = await RecordCodeGenerator.GenerateMaintenanceRequestIdAsync(_context);
                var record = new MaintenanceRecord
                {
                    Id = Guid.NewGuid().ToString(),
                    RequestId = requestId,
                    ScheduleSeriesId = persistedSeriesId,
                    AssetId = dto.AssetId,
                    Description = dto.Description,
                    Status = dto.Status,
                    Priority = dto.Priority,
                    Type = dto.Type,
                    Frequency = dto.Frequency,
                    StartDate = occ,
                    EndDate = null,
                    Cost = null,
                    Attachments = dto.Attachments,
                    DiagnosisOutcome = dto.DiagnosisOutcome,
                    InspectionNotes = dto.InspectionNotes,
                    QuotationNotes = dto.QuotationNotes,
                    DateReported = now,
                    CreatedAt = now,
                    UpdatedAt = now,
                    TenantId = IsSuperAdmin() ? null : tenantId,
                    IsArchived = false
                };
                _context.MaintenanceRecords.Add(record);
                created.Add(record);
            }

            if (IsAdminOrSuperAdminCreator(User))
                await _notificationService.NotifyMaintenanceNewTicketFromAdminAsync(created[0]);
            else if (string.Equals((dto.Type ?? "").Trim(), "Corrective", StringComparison.OrdinalIgnoreCase))
                await _notificationService.NotifyFinanceMaintenanceCorrectiveLoggedAsync(created[0]);

            await _context.SaveChangesAsync();

            var userId = GetCurrentUserId();
            var firstId = created[0].Id;
            _auditService.AddEntry(HttpContext,
                IsSuperAdmin() ? null : tenantId,
                userId,
                null,
                "Maintenance",
                "Create",
                "MaintenanceRecord",
                firstId,
                $"Maintenance schedule batch: {created.Count} occurrence(s) ({dto.Type}, status {dto.Status}) for asset {asset.AssetCode ?? dto.AssetId}.");

            await _context.SaveChangesAsync();

            var activeAllocation = await _context.AssetAllocations
                .Include(aa => aa.Room)
                .FirstOrDefaultAsync(aa => aa.AssetId == dto.AssetId && aa.Status == "Active");

            var allocDict = new Dictionary<string, AssetAllocation>();
            if (activeAllocation != null) allocDict[dto.AssetId] = activeAllocation;

            var dtos = new List<MaintenanceRecordResponseDto>();
            foreach (var r in created)
            {
                r.Asset = asset;
                dtos.Add(MapToDto(r, allocDict, DateTime.UtcNow));
            }

            return StatusCode(StatusCodes.Status201Created, new { items = dtos, count = dtos.Count });
        }

        [HttpPut("{id}")]
        [RequirePermission("Maintenance", "CanEdit")]
        public async Task<IActionResult> PutMaintenanceRecord(string id, UpdateMaintenanceRecordDto dto)
        {
            var tenantId = GetCurrentTenantId();
            var existing = await _context.MaintenanceRecords
                .Include(r => r.Asset)
                .FirstOrDefaultAsync(r => r.Id == id);

            if (existing == null) return NotFound();
            if (!IsMaintenanceVisibleToTenant(existing, tenantId)) return NotFound();

            dto.Description = (dto.Description ?? "").Trim();
            dto.AssetId = (dto.AssetId ?? "").Trim();

            if (string.Equals(dto.Status, "Inspection", StringComparison.OrdinalIgnoreCase)
                && !string.Equals(existing.Status, "Inspection", StringComparison.OrdinalIgnoreCase))
            {
                if (existing.StartDate.HasValue && existing.StartDate.Value.Date > DateTime.UtcNow.Date)
                    return BadRequest(new { message = "Inspection cannot begin before the scheduled start date." });
            }

            if (string.Equals(dto.Status, "Finance Review", StringComparison.OrdinalIgnoreCase)
                && !string.Equals(existing.Status, "Finance Review", StringComparison.OrdinalIgnoreCase))
            {
                if (!string.Equals(existing.Status, "Inspection", StringComparison.OrdinalIgnoreCase)
                    && !string.Equals(existing.Status, "Quoted", StringComparison.OrdinalIgnoreCase))
                    return BadRequest(new { message = "Finance Review is only valid after inspection or quotation." });
            }

            var partsReadyToScheduled =
                string.Equals(existing.Status, "In Progress", StringComparison.OrdinalIgnoreCase)
                && string.Equals(dto.Status, "Scheduled", StringComparison.OrdinalIgnoreCase)
                && string.Equals(existing.FinanceRequestType ?? "", "Repair", StringComparison.OrdinalIgnoreCase)
                && string.Equals(existing.FinanceWorkflowStatus ?? "", "Parts Ready", StringComparison.OrdinalIgnoreCase);

            if (partsReadyToScheduled && !dto.StartDate.HasValue)
                return BadRequest(new { message = "A scheduled date is required." });

            if (partsReadyToScheduled && string.IsNullOrWhiteSpace(dto.Frequency))
                dto.Frequency = string.IsNullOrWhiteSpace(existing.Frequency) ? "One-time" : existing.Frequency;

            // Validate status transition
            if (!IsValidTransition(existing.Status, dto.Status) && !partsReadyToScheduled)
                return BadRequest(new { message = $"Cannot transition from '{existing.Status}' to '{dto.Status}'." });

            // Validate AssetId exists and belongs to same tenant
            var asset = await _context.Assets.FindAsync(dto.AssetId);
            if (asset == null) return BadRequest(new { message = "Asset not found." });
            if (!IsSuperAdmin() && tenantId.HasValue && asset.TenantId != tenantId)
                return BadRequest(new { message = "Asset does not belong to your organization." });

            var activeAllocPut = await _context.AssetAllocations.AsNoTracking()
                .FirstOrDefaultAsync(aa => aa.AssetId == dto.AssetId && aa.Status == "Active");
            var allocPutErr = ValidateActiveAllocationAndOptionalRoom(dto.RoomId, activeAllocPut);
            if (allocPutErr != null) return allocPutErr;

            var scheduleErr = MaintenanceSchedulingService.ValidateSchedule(dto.Frequency, dto.StartDate, dto.EndDate);
            if (scheduleErr != null)
                return BadRequest(new { message = scheduleErr });

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
            var record = await _context.MaintenanceRecords
                .Include(r => r.Asset)
                .FirstOrDefaultAsync(r => r.Id == id);

            if (record == null) return NotFound();
            if (!IsMaintenanceVisibleToTenant(record, tenantId)) return NotFound();

            if (string.Equals(record.FinanceWorkflowStatus, "Pending Approval", StringComparison.OrdinalIgnoreCase))
                return BadRequest(new { message = "Cannot archive this maintenance schedule while it is awaiting Finance approval. Please wait for approval or rejection before archiving." });

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
            var record = await _context.MaintenanceRecords
                .Include(r => r.Asset)
                .FirstOrDefaultAsync(r => r.Id == id);

            if (record == null) return NotFound();
            if (!IsMaintenanceVisibleToTenant(record, tenantId)) return NotFound();

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

        /// <summary>Completes inspection with a diagnosis-specific workflow (Finance Review or immediate completion).</summary>
        [HttpPost("{id}/inspection-workflow")]
        [RequirePermission("Maintenance", "CanEdit")]
        public async Task<ActionResult<MaintenanceRecordResponseDto>> SubmitInspectionWorkflow(string id, [FromBody] InspectionWorkflowSubmitDto dto)
        {
            if (!ModelState.IsValid)
            {
                var errors = ModelState
                    .Where(kv => kv.Value?.Errors.Count > 0)
                    .ToDictionary(kv => kv.Key, kv => kv.Value!.Errors.Select(e => e.ErrorMessage).ToArray());
                return BadRequest(new { message = "Validation failed.", errors });
            }

            var tenantId = GetCurrentTenantId();
            var record = await _context.MaintenanceRecords
                .Include(r => r.Asset)
                    .ThenInclude(a => a!.Category)
                .FirstOrDefaultAsync(r => r.Id == id);

            if (record == null) return NotFound();
            if (!IsMaintenanceVisibleToTenant(record, tenantId)) return NotFound();

            var allowedFrom = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            {
                "Pending", "Open", "Scheduled", "Inspection"
            };
            if (!allowedFrom.Contains(record.Status))
                return BadRequest(new { message = $"Inspection workflow cannot be submitted from status '{record.Status}'." });

            // Only block when the record is already in Inspection (field work) before the scheduled day.
            // Scheduled / Open / Pending may still submit diagnosis (e.g. Not Repairable → Finance) without waiting for the visit date.
            if (string.Equals(record.Status, "Inspection", StringComparison.OrdinalIgnoreCase)
                && record.StartDate.HasValue
                && record.StartDate.Value.Date > DateTime.UtcNow.Date)
                return BadRequest(new { message = "Inspection cannot begin before the scheduled start date." });

            var outcome = (dto.Outcome ?? "").Trim();
            if (string.Equals(outcome, "No Fix Needed", StringComparison.OrdinalIgnoreCase))
            {
                var notes = (dto.DetailNotes ?? "").Trim();
                if (string.IsNullOrWhiteSpace(notes))
                    return BadRequest(new { message = "Description is required for this outcome." });

                record.DiagnosisOutcome = "No Fix Needed";
                record.QuotationNotes = notes;
                record.InspectionNotes = null;
                record.Status = "Completed";
                record.FinanceRequestType = null;
                record.FinanceWorkflowStatus = null;
            }
            else if (string.Equals(outcome, "Repairable", StringComparison.OrdinalIgnoreCase))
            {
                var notes = (dto.DetailNotes ?? "").Trim();
                if (string.IsNullOrWhiteSpace(notes))
                    return BadRequest(new { message = "Repair description is required." });
                if (!dto.EstimatedRepairCost.HasValue || dto.EstimatedRepairCost.Value <= 0)
                    return BadRequest(new { message = "Estimated repair cost must be greater than zero." });

                record.DiagnosisOutcome = "Repairable";
                record.QuotationNotes = notes;
                record.Cost = dto.EstimatedRepairCost;
                record.Attachments = string.IsNullOrWhiteSpace(dto.Attachments) ? null : dto.Attachments.Trim();
                record.Status = "Finance Review";
                record.FinanceRequestType = "Repair";
                record.FinanceWorkflowStatus = "Pending Approval";
            }
            else if (string.Equals(outcome, "Not Repairable", StringComparison.OrdinalIgnoreCase))
            {
                var notes = (dto.DetailNotes ?? "").Trim();
                if (string.IsNullOrWhiteSpace(notes))
                    return BadRequest(new { message = "Description explaining why the asset is not repairable is required." });

                // Maintenance inspection no longer links a replacement PO; Procurement/Finance handle POs separately.
                record.LinkedPurchaseOrderId = null;

                record.DiagnosisOutcome = "Not Repairable";
                record.QuotationNotes = notes;
                record.Status = "Finance Review";
                record.FinanceRequestType = "Replacement";
                record.FinanceWorkflowStatus = "Pending Approval";
            }
            else
                return BadRequest(new { message = "Outcome must be Repairable, Not Repairable, or No Fix Needed." });

            record.UpdatedAt = DateTime.UtcNow;

            _auditService.AddEntry(HttpContext,
                IsSuperAdmin() ? null : tenantId,
                GetCurrentUserId(),
                null,
                "Maintenance",
                "Update",
                "MaintenanceRecord",
                record.Id,
                $"Inspection workflow submitted ({outcome}) for request {record.RequestId ?? record.Id}.");

            if (string.Equals(record.Status, "Finance Review", StringComparison.OrdinalIgnoreCase))
                await _notificationService.NotifyFinanceMaintenanceApprovalNeededAsync(record);

            await _context.SaveChangesAsync();

            var activeAllocation = await _context.AssetAllocations
                .Include(aa => aa.Room)
                .FirstOrDefaultAsync(aa => aa.AssetId == record.AssetId && aa.Status == "Active");
            var allocDict = new Dictionary<string, AssetAllocation>();
            if (activeAllocation != null) allocDict[record.AssetId] = activeAllocation;

            record.Asset ??= await _context.Assets.Include(a => a.Category).FirstAsync(a => a.Id == record.AssetId);
            return Ok(MapToDto(record, allocDict, DateTime.UtcNow));
        }

        /// <summary>Maintenance marks a finance-approved repair visit as completed and writes asset repair history.</summary>
        [HttpPost("{id}/complete-repair")]
        [RequirePermission("Maintenance", "CanEdit")]
        public async Task<IActionResult> CompleteRepair(string id, [FromBody] CompleteRepairDto dto)
        {
            if (!ModelState.IsValid)
            {
                var errors = ModelState
                    .Where(kv => kv.Value?.Errors.Count > 0)
                    .ToDictionary(kv => kv.Key, kv => kv.Value!.Errors.Select(e => e.ErrorMessage).ToArray());
                return BadRequest(new { message = "Validation failed.", errors });
            }

            var tenantId = GetCurrentTenantId();
            var record = await _context.MaintenanceRecords
                .Include(r => r.Asset)
                .FirstOrDefaultAsync(r => r.Id == id);

            if (record == null) return NotFound();
            if (!IsMaintenanceVisibleToTenant(record, tenantId)) return NotFound();

            var asset = record.Asset;
            if (asset == null) return BadRequest(new { message = "Associated asset not found." });

            if (!string.Equals(record.FinanceRequestType, "Repair", StringComparison.OrdinalIgnoreCase))
                return BadRequest(new { message = "This action is only for finance repair requests." });

            var wf = (record.FinanceWorkflowStatus ?? "").Trim();
            if (!string.Equals(wf, "Parts Ready", StringComparison.OrdinalIgnoreCase)
                && !string.Equals(wf, "Approved", StringComparison.OrdinalIgnoreCase))
                return BadRequest(new { message = "Repair can only be completed after finance has approved the repair workflow." });

            if (!string.Equals(record.Status, "Scheduled", StringComparison.OrdinalIgnoreCase)
                && !string.Equals(record.Status, "In Progress", StringComparison.OrdinalIgnoreCase))
                return BadRequest(new { message = $"Repair completion is not valid from status '{record.Status}'." });

            var desc = (dto.RepairDescription ?? "").Trim();
            if (string.IsNullOrWhiteSpace(desc))
                return BadRequest(new { message = "Repair description is required." });

            var prev = asset.CurrentCondition;
            asset.CurrentCondition = AssetCondition.Good;
            asset.UpdatedAt = DateTime.UtcNow;

            record.Status = "Completed";
            record.FinanceWorkflowStatus = null;
            record.InspectionNotes = string.IsNullOrWhiteSpace(record.InspectionNotes)
                ? desc
                : $"{record.InspectionNotes}\n[Repair completed] {desc}";
            record.UpdatedAt = DateTime.UtcNow;

            var reqLabel = !string.IsNullOrEmpty(record.RequestId) ? record.RequestId : record.Id;
            _context.AssetConditionLogs.Add(new AssetConditionLog
            {
                AssetId = asset.Id,
                PreviousCondition = prev,
                NewCondition = asset.CurrentCondition,
                Notes = desc,
                MaintenanceRecordId = record.Id,
                ChangedBy = User.FindFirst(ClaimTypes.Email)?.Value ?? User.Identity?.Name ?? "Maintenance",
                TenantId = tenantId ?? asset.TenantId,
            });

            _auditService.AddEntry(HttpContext,
                tenantId,
                GetCurrentUserId(),
                null,
                "Maintenance",
                "Update",
                "MaintenanceRecord",
                record.Id,
                $"Repair marked completed for {reqLabel}.");

            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpDelete("{id}")]
        [RequirePermission("Maintenance", "CanArchive")]
        public async Task<IActionResult> DeleteMaintenanceRecord(string id)
        {
            var tenantId = GetCurrentTenantId();
            var record = await _context.MaintenanceRecords
                .Include(r => r.Asset)
                .FirstOrDefaultAsync(r => r.Id == id);

            if (record == null) return NotFound();
            if (!IsMaintenanceVisibleToTenant(record, tenantId)) return NotFound();

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
            if (!IsMaintenanceVisibleToTenant(record, tenantId)) return NotFound();

            var asset = record.Asset;
            if (asset == null) return BadRequest(new { message = "Associated asset not found." });

            // Log condition change
            _context.AssetConditionLogs.Add(new AssetConditionLog
            {
                AssetId = asset.Id,
                PreviousCondition = asset.CurrentCondition,
                NewCondition = AssetCondition.Critical,
                Notes = $"Marked as beyond repair from maintenance ticket {record.Id}",
                MaintenanceRecordId = maintenanceId,
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

            await _notificationService.NotifyReplacementNeededAsync(asset, tenantId);

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
                    l.MaintenanceRecordId,
                    l.ChangedBy,
                    l.CreatedAt
                })
                .ToListAsync();

            return Ok(logs);
        }

        // ── Helpers ───────────────────────────────────────────────

        private IActionResult? ValidateActiveAllocationAndOptionalRoom(string? requestedRoomId, AssetAllocation? alloc)
        {
            if (alloc == null)
                return BadRequest(new { message = "This asset has no active room allocation. Assign the asset to a room before scheduling maintenance." });
            if (!string.IsNullOrWhiteSpace(requestedRoomId)
                && !string.Equals(requestedRoomId.Trim(), alloc.RoomId, StringComparison.Ordinal))
                return BadRequest(new { message = "Room selection does not match this asset's active allocation." });
            return null;
        }

        private bool IsMaintenanceVisibleToTenant(MaintenanceRecord r, int? tenantId)
        {
            if (IsSuperAdmin()) return true;
            if (!tenantId.HasValue) return false;
            if (r.TenantId == tenantId) return true;
            return r.TenantId == null && r.Asset != null && r.Asset.TenantId == tenantId;
        }

        private sealed record MaintenanceRecordListRow(
            string Id,
            string? RequestId,
            string AssetId,
            string? AssetName,
            string? AssetCode,
            string? CategoryName,
            string Description,
            string Status,
            string Priority,
            string Type,
            string? Frequency,
            DateTime? StartDate,
            DateTime? EndDate,
            decimal? Cost,
            string? Attachments,
            string? DiagnosisOutcome,
            string? InspectionNotes,
            string? QuotationNotes,
            DateTime DateReported,
            bool IsArchived,
            DateTime CreatedAt,
            DateTime UpdatedAt,
            int? TenantId,
            string? FinanceRequestType,
            string? FinanceWorkflowStatus,
            string? LinkedPurchaseOrderId,
            string? ReplacementRegisteredAssetId,
            string? ScheduleSeriesId);

        private static MaintenanceRecordResponseDto MapListRowToDto(
            MaintenanceRecordListRow r,
            IReadOnlyDictionary<string, (string? RoomId, string? RoomCode, string? RoomName, string? RoomFloor)> roomByAsset,
            DateTime utcNow)
        {
            roomByAsset.TryGetValue(r.AssetId, out var room);
            return new MaintenanceRecordResponseDto
            {
                Id = r.Id,
                RequestId = r.RequestId,
                AssetId = r.AssetId,
                AssetName = r.AssetName,
                AssetCode = r.AssetCode,
                TagNumber = null,
                CategoryName = r.CategoryName,
                RoomId = room.RoomId,
                RoomCode = room.RoomCode,
                RoomName = room.RoomName,
                RoomFloor = room.RoomFloor,
                Description = r.Description,
                Status = r.Status,
                Priority = r.Priority,
                Type = r.Type,
                Frequency = r.Frequency,
                StartDate = r.StartDate,
                EndDate = r.EndDate,
                NextDueDate = MaintenanceSchedulingService.ComputeNextDueDate(
                    r.IsArchived, r.Status, r.Frequency, r.StartDate, r.EndDate, utcNow),
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

        private static MaintenanceScheduleSummaryDto MapToScheduleSummaryDto(MaintenanceRecord r, Dictionary<string, AssetAllocation> activeAllocations, DateTime utcNow)
        {
            activeAllocations.TryGetValue(r.AssetId, out var alloc);

            return new MaintenanceScheduleSummaryDto
            {
                Id = r.Id,
                RequestId = r.RequestId,
                AssetId = r.AssetId,
                AssetName = r.Asset?.AssetName,
                AssetCode = r.Asset?.AssetCode,
                RoomId = alloc?.Room?.Id,
                RoomCode = alloc?.Room?.RoomCode,
                RoomName = alloc?.Room?.Name,
                RoomFloor = alloc?.Room != null && !string.IsNullOrWhiteSpace(alloc.Room.Floor) ? alloc.Room.Floor.Trim() : null,
                Type = r.Type,
                Priority = r.Priority,
                Frequency = r.Frequency,
                StartDate = r.StartDate,
                EndDate = r.EndDate,
                NextDueDate = MaintenanceSchedulingService.ComputeNextDueDate(r, utcNow),
                Status = r.Status,
                ScheduleSeriesId = r.ScheduleSeriesId,
            };
        }

        private static MaintenanceRecordResponseDto MapToDto(MaintenanceRecord r, Dictionary<string, AssetAllocation> activeAllocations, DateTime utcNow)
        {
            activeAllocations.TryGetValue(r.AssetId, out var alloc);

            return new MaintenanceRecordResponseDto
            {
                Id = r.Id,
                RequestId = r.RequestId,
                AssetId = r.AssetId,
                AssetName = r.Asset?.AssetName,
                AssetCode = r.Asset?.AssetCode,
                TagNumber = null,
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
}
