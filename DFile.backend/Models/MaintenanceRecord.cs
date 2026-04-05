using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DFile.backend.Models
{
    public class MaintenanceRecord
    {
        [Key]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        public string AssetId { get; set; } = string.Empty;

        [ForeignKey("AssetId")]
        public Asset? Asset { get; set; }

        public string Description { get; set; } = string.Empty;
        public string Status { get; set; } = "Pending"; // Pending, In Progress, Completed, Scheduled
        public string Priority { get; set; } = "Medium"; // Low, Medium, High
        public string Type { get; set; } = "Corrective"; // Preventive, Corrective, Upgrade, Inspection
        public string? Frequency { get; set; } // One-time, Daily, Weekly, Monthly, Yearly
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public decimal? Cost { get; set; }
        public DateTime DateReported { get; set; } = DateTime.UtcNow;
        public string? Attachments { get; set; } // Comma separated string for simplicity in SQL
        public string? DiagnosisOutcome { get; set; } // "Repairable", "Not Repairable", null
        public string? InspectionNotes { get; set; }
        public string? QuotationNotes { get; set; }

        /// <summary>Human-readable ID for maintenance requests (e.g. RQ-1234).</summary>
        public string? RequestId { get; set; }

        /// <summary>Client-generated idempotency key; all rows from one recurring create share this value.</summary>
        public string? ScheduleSeriesId { get; set; }

        /// <summary>Repair | Replacement — set when submitted to Finance.</summary>
        public string? FinanceRequestType { get; set; }

        /// <summary>Pending Approval | Approved | Rejected | Waiting for Replacement | Replacement Completed</summary>
        public string? FinanceWorkflowStatus { get; set; }

        public string? LinkedPurchaseOrderId { get; set; }

        public string? ReplacementRegisteredAssetId { get; set; }

        public bool IsArchived { get; set; } = false;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        public int? TenantId { get; set; }

        [ForeignKey("TenantId")]
        public Tenant? Tenant { get; set; }
    }
}
