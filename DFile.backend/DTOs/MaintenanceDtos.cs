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
        public decimal? Cost { get; set; }
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
