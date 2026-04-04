using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DFile.backend.Models
{
    public class Asset
    {
        [Key]
        public string Id { get; set; } = string.Empty;

        [Required]
        public string AssetCode { get; set; } = string.Empty;

        public string? TagNumber { get; set; }

        [Required]
        public string AssetName { get; set; } = string.Empty;

        [Required]
        public string CategoryId { get; set; } = string.Empty;

        [ForeignKey("CategoryId")]
        public AssetCategory? Category { get; set; }

        public LifecycleStatus LifecycleStatus { get; set; } = LifecycleStatus.Registered;

        public AssetCondition CurrentCondition { get; set; } = AssetCondition.Good;

        public string? HandlingTypeSnapshot { get; set; }

        public string? Room { get; set; }
        public string? Image { get; set; }
        public string? Manufacturer { get; set; }
        public string? Model { get; set; }
        public string? SerialNumber { get; set; }
        public DateTime? PurchaseDate { get; set; }
        public string? Vendor { get; set; }
        public decimal AcquisitionCost { get; set; }
        public int UsefulLifeYears { get; set; }
        public decimal PurchasePrice { get; set; }
        public decimal? ResidualValue { get; set; }
        public decimal? SalvagePercentage { get; set; }
        public decimal? SalvageValue { get; set; }
        public bool IsSalvageOverride { get; set; } = false;
        public decimal CurrentBookValue { get; set; }
        public decimal MonthlyDepreciation { get; set; }
        public int DepreciationMonthsApplied { get; set; }
        public int? TenantId { get; set; }

        [ForeignKey("TenantId")]
        public Tenant? Tenant { get; set; }

        public string? PurchaseOrderId { get; set; }

        [ForeignKey("PurchaseOrderId")]
        public PurchaseOrder? PurchaseOrder { get; set; }

        public DateTime? WarrantyExpiry { get; set; }
        public string? Notes { get; set; }
        public string? Documents { get; set; }
        public bool IsArchived { get; set; } = false;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        public int? CreatedBy { get; set; }
        public int? UpdatedBy { get; set; }

        [ForeignKey("CreatedBy")]
        public User? CreatedByUser { get; set; }

        [ForeignKey("UpdatedBy")]
        public User? UpdatedByUser { get; set; }

        [Timestamp]
        public byte[]? RowVersion { get; set; }
    }
}
