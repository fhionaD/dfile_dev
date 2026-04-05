using System.ComponentModel.DataAnnotations;

namespace DFile.backend.DTOs
{
    public class CreateMaintenanceRecordDto
    {
        [Required]
        public string AssetId { get; set; } = string.Empty;

        [Required]
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
    }

    public class UpdateMaintenanceRecordDto
    {
        [Required]
        public string AssetId { get; set; } = string.Empty;

        [Required]
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

        /// <summary>Required when Outcome is Not Repairable — replacement PO already created.</summary>
        public string? LinkedPurchaseOrderId { get; set; }
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
