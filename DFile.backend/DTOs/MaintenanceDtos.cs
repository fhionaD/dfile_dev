using System.ComponentModel.DataAnnotations;

namespace DFile.backend.DTOs
{
    public class CreateMaintenanceRecordDto
    {
        [Required]
        public string AssetId { get; set; } = string.Empty;

        /// <summary>Optional; when set must match the asset's active allocation room (disambiguation + validation).</summary>
        public string? RoomId { get; set; }

        /// <summary>Optional when Frequency is set (scheduled batch); otherwise required by the API.</summary>
        public string Description { get; set; } = string.Empty;

        public string Status { get; set; } = "Open";
        public string Priority { get; set; } = "Medium";
        public string Type { get; set; } = "Corrective";
        public string? Frequency { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public string? Attachments { get; set; }
        public string? DiagnosisOutcome { get; set; }
        public string? InspectionNotes { get; set; }
        public string? QuotationNotes { get; set; }

        /// <summary>Optional UUID from client; prevents duplicate rows if the same batch is submitted twice.</summary>
        public string? ScheduleSeriesId { get; set; }
    }

    public class UpdateMaintenanceRecordDto
    {
        [Required]
        public string AssetId { get; set; } = string.Empty;

        /// <summary>Optional; when set must match the asset's active allocation room.</summary>
        public string? RoomId { get; set; }

        public string Description { get; set; } = string.Empty;

        public string Status { get; set; } = "Open";
        public string Priority { get; set; } = "Medium";
        public string Type { get; set; } = "Corrective";
        public string? Frequency { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public decimal? Cost { get; set; }
        public DateTime? DateReported { get; set; }
        public string? Attachments { get; set; }
        public string? DiagnosisOutcome { get; set; }
        public string? InspectionNotes { get; set; }
        public string? QuotationNotes { get; set; }
    }

    public class MaintenanceRecordResponseDto
    {
        public string Id { get; set; } = string.Empty;
        public string? RequestId { get; set; }
        public string AssetId { get; set; } = string.Empty;

        // Denormalized Asset fields
        public string? AssetName { get; set; }
        public string? AssetCode { get; set; }
        public string? TagNumber { get; set; }
        public string? CategoryName { get; set; }

        // Denormalized Room fields (from active allocation)
        public string? RoomId { get; set; }
        public string? RoomCode { get; set; }
        public string? RoomName { get; set; }
        public string? RoomFloor { get; set; }

        // Maintenance record fields
        public string Description { get; set; } = string.Empty;
        public string Status { get; set; } = "Open";
        public string Priority { get; set; } = "Medium";
        public string Type { get; set; } = "Corrective";
        public string? Frequency { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public DateTime? NextDueDate { get; set; }
        public decimal? Cost { get; set; }
        public string? Attachments { get; set; }
        public string? DiagnosisOutcome { get; set; }
        public string? InspectionNotes { get; set; }
        public string? QuotationNotes { get; set; }
        public DateTime DateReported { get; set; }
        public bool IsArchived { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public int? TenantId { get; set; }

        public string? FinanceRequestType { get; set; }
        public string? FinanceWorkflowStatus { get; set; }
        public string? LinkedPurchaseOrderId { get; set; }
        public string? ReplacementRegisteredAssetId { get; set; }

        public string? ScheduleSeriesId { get; set; }
    }

    /// <summary>
    /// Schedule-focused view: no finance execution fields, quotation, inspection notes, or attachments.
    /// </summary>
    public class MaintenanceScheduleSummaryDto
    {
        public string Id { get; set; } = string.Empty;
        public string? RequestId { get; set; }
        public string AssetId { get; set; } = string.Empty;
        public string? AssetName { get; set; }
        public string? AssetCode { get; set; }
        public string? RoomId { get; set; }
        public string? RoomCode { get; set; }
        public string? RoomName { get; set; }
        public string? RoomFloor { get; set; }
        public string Type { get; set; } = "Corrective";
        public string Priority { get; set; } = "Medium";
        public string? Frequency { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public DateTime? NextDueDate { get; set; }
        public string Status { get; set; } = "Open";
        public string? ScheduleSeriesId { get; set; }
    }

    /// <summary>
    /// Finance-only view of what Maintenance submitted (repair vs replacement). Excludes workflow/status/history fields.
    /// </summary>
    public class FinanceMaintenanceSubmissionDetailDto
    {
        public string Id { get; set; } = string.Empty;
        public string? RequestId { get; set; }
        public string FinanceRequestType { get; set; } = string.Empty;

        public string AssetId { get; set; } = string.Empty;
        public string? AssetName { get; set; }
        public string? AssetCode { get; set; }
        public string? CategoryName { get; set; }
        public string? RoomId { get; set; }
        public string? RoomCode { get; set; }
        public string? RoomName { get; set; }

        /// <summary>Repair path: text from Maintenance inspection.</summary>
        public string? RepairDescription { get; set; }
        public decimal? EstimatedRepairCost { get; set; }
        public IReadOnlyList<string> DamagedPartImageUrls { get; set; } = Array.Empty<string>();

        /// <summary>Replacement / not repairable path: explanation from Maintenance.</summary>
        public string? NotRepairableExplanation { get; set; }
    }

    /// <summary>
    /// Finance queue / awaiting-parts list: triage identifiers and workflow flags only (no description, notes, dates, or attachments).
    /// </summary>
    public class FinanceMaintenanceQueueRowDto
    {
        public string Id { get; set; } = string.Empty;
        public string? RequestId { get; set; }
        public string AssetId { get; set; } = string.Empty;
        public string? AssetName { get; set; }
        public string? AssetCode { get; set; }
        public string Status { get; set; } = string.Empty;
        public string? FinanceRequestType { get; set; }
        public string? FinanceWorkflowStatus { get; set; }
        public string? DiagnosisOutcome { get; set; }
        public string? LinkedPurchaseOrderId { get; set; }
        public decimal? Cost { get; set; }
    }

    public class InspectionWorkflowSubmitDto
    {
        /// <summary>Repairable | Not Repairable | No Fix Needed</summary>
        [Required]
        public string Outcome { get; set; } = string.Empty;

        /// <summary>Repair description, not-repairable justification, or no-fix notes.</summary>
        public string? DetailNotes { get; set; }

        /// <summary>Required when Outcome is Repairable.</summary>
        public decimal? EstimatedRepairCost { get; set; }

        public string? Attachments { get; set; }

        /// <summary>Ignored for maintenance inspection (replacement PO is not captured at this step).</summary>
        public string? LinkedPurchaseOrderId { get; set; }
    }

    /// <summary>Maintenance completes an on-site finance-approved repair visit.</summary>
    public class CompleteRepairDto
    {
        [Required]
        [MinLength(1)]
        [MaxLength(2000)]
        public string RepairDescription { get; set; } = string.Empty;
    }

    public class CompleteReplacementAssetDto
    {
        [Required]
        public string AssetName { get; set; } = string.Empty;

        [Required]
        public string CategoryId { get; set; } = string.Empty;

        public string? SerialNumber { get; set; }

        public decimal Cost { get; set; }

        public DateTime? DateOfAcquisition { get; set; }

        public string? Documentation { get; set; }
    }

    public class AllocatedAssetForMaintenanceDto
    {
        public string AssetId { get; set; } = string.Empty;
        public string? AssetCode { get; set; }
        public string? AssetName { get; set; }
        public string? TagNumber { get; set; }
        public string? CategoryName { get; set; }
        public string RoomId { get; set; } = string.Empty;
        public string? RoomCode { get; set; }
        public string? RoomName { get; set; }
        public DateTime AllocatedAt { get; set; }
        public int? TenantId { get; set; }
    }
}
