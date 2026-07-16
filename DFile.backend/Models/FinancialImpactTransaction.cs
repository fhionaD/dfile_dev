using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DFile.backend.Models
{
    /// <summary>
    /// Audit trail for all financial impact decisions made on maintenance records.
    /// Tracks asset value adjustments, useful life extensions, and maintenance spend amounts.
    /// </summary>
    public class FinancialImpactTransaction
    {
        [Key]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        [Required]
        public string MaintenanceRecordId { get; set; } = string.Empty;

        [ForeignKey("MaintenanceRecordId")]
        public MaintenanceRecord? MaintenanceRecord { get; set; }

        [Required]
        public string AssetId { get; set; } = string.Empty;

        [ForeignKey("AssetId")]
        public Asset? Asset { get; set; }

        /// <summary>
        /// Financial decision: Expense | IncreaseValue | ExtendLife | Both
        /// </summary>
        [Required]
        public string FinanceDecision { get; set; } = string.Empty;

        /// <summary>
        /// Amount added to asset value (for IncreaseValue or Both decisions).
        /// Null if decision does not involve asset value change.
        /// </summary>
        [Column(TypeName = "decimal(18,2)")]
        public decimal? AdjustmentValue { get; set; }

        /// <summary>
        /// Additional months extended to asset's useful life (for ExtendLife or Both decisions).
        /// Null if decision does not involve life extension.
        /// </summary>
        public int? AddedLifeMonths { get; set; }

        /// <summary>
        /// Actual maintenance spend cost (for Expense decision).
        /// For "Treat as Expense" decisions, this records the actual amount spent on maintenance.
        /// Null for other decision types.
        /// </summary>
        [Column(TypeName = "decimal(18,2)")]
        public decimal? MaintenanceSpendCost { get; set; }

        /// <summary>
        /// Asset value BEFORE this transaction (for audit trail).
        /// </summary>
        [Column(TypeName = "decimal(18,2)")]
        public decimal PreviousPurchasePrice { get; set; }

        /// <summary>
        /// Asset useful life in MONTHS BEFORE this transaction (for audit trail).
        /// </summary>
        public int PreviousTotalLifeMonths { get; set; }

        /// <summary>
        /// Monthly depreciation BEFORE this transaction (for audit trail).
        /// </summary>
        [Column(TypeName = "decimal(18,2)")]
        public decimal PreviousMonthlyDepreciation { get; set; }

        /// <summary>
        /// User ID who approved this financial impact decision.
        /// </summary>
        public int? ApprovedBy { get; set; }

        [ForeignKey("ApprovedBy")]
        public User? ApprovedByUser { get; set; }

        /// <summary>
        /// Timestamp when this financial impact decision was made.
        /// </summary>
        public DateTime ApprovedAt { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Tenant for multi-tenancy support.
        /// </summary>
        public int? TenantId { get; set; }

        [ForeignKey("TenantId")]
        public Tenant? Tenant { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Timestamp]
        public byte[]? RowVersion { get; set; }
    }
}
