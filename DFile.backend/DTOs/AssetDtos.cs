using System.ComponentModel.DataAnnotations;
using DFile.backend.Models;

namespace DFile.backend.DTOs
{
    public class CreateAssetDto
    {
        [Required(ErrorMessage = "Asset name is required.")]
        public string AssetName { get; set; } = string.Empty;

        [Required(ErrorMessage = "CategoryId is required.")]
        public string CategoryId { get; set; } = string.Empty;

        public LifecycleStatus LifecycleStatus { get; set; } = LifecycleStatus.Registered;
        public AssetCondition CurrentCondition { get; set; } = AssetCondition.Good;
        public string? Room { get; set; }
        public string? Image { get; set; }
        public string? Manufacturer { get; set; }
        public string? Model { get; set; }
        public string? SerialNumber { get; set; }
        public DateTime? PurchaseDate { get; set; }
        public string? Vendor { get; set; }

        [Range(0, double.MaxValue, ErrorMessage = "Acquisition cost must be >= 0.")]
        public decimal AcquisitionCost { get; set; }

        [Range(1, int.MaxValue, ErrorMessage = "Useful life must be at least 1 year.")]
        public int UsefulLifeYears { get; set; }

        [Range(0, double.MaxValue, ErrorMessage = "Purchase price must be >= 0.")]
        public decimal PurchasePrice { get; set; }

        public decimal? ResidualValue { get; set; }

        [Range(0, 100, ErrorMessage = "Salvage percentage must be between 0 and 100.")]
        public decimal? SalvagePercentage { get; set; }
        public bool IsSalvageOverride { get; set; } = false;

        public DateTime? WarrantyExpiry { get; set; }
        public string? Notes { get; set; }
        public string? Documents { get; set; }

        /// <summary>When set, completes finance replacement workflow: creates asset, disposes original, completes maintenance record.</summary>
        public string? ReplacementMaintenanceRecordId { get; set; }
    }

    public class UpdateAssetDto
    {
        [Required(ErrorMessage = "Asset name is required.")]
        public string AssetName { get; set; } = string.Empty;

        [Required(ErrorMessage = "CategoryId is required.")]
        public string CategoryId { get; set; } = string.Empty;

        public LifecycleStatus LifecycleStatus { get; set; } = LifecycleStatus.Registered;
        public AssetCondition CurrentCondition { get; set; } = AssetCondition.Good;
        public string? Room { get; set; }
        public string? Image { get; set; }
        public string? Manufacturer { get; set; }
        public string? Model { get; set; }
        public string? SerialNumber { get; set; }
        public DateTime? PurchaseDate { get; set; }
        public string? Vendor { get; set; }

        [Range(0, double.MaxValue, ErrorMessage = "Acquisition cost must be >= 0.")]
        public decimal AcquisitionCost { get; set; }

        [Range(1, int.MaxValue, ErrorMessage = "Useful life must be at least 1 year.")]
        public int UsefulLifeYears { get; set; }

        [Range(0, double.MaxValue, ErrorMessage = "Purchase price must be >= 0.")]
        public decimal PurchasePrice { get; set; }

        public decimal? ResidualValue { get; set; }

        [Range(0, 100, ErrorMessage = "Salvage percentage must be between 0 and 100.")]
        public decimal? SalvagePercentage { get; set; }
        public bool IsSalvageOverride { get; set; } = false;

        public decimal CurrentBookValue { get; set; }
        public decimal MonthlyDepreciation { get; set; }
        public DateTime? WarrantyExpiry { get; set; }
        public string? Notes { get; set; }
        public string? Documents { get; set; }
        public byte[]? RowVersion { get; set; }
    }

    public class UpdateAssetFinancialDto
    {
        [Range(0, double.MaxValue)]
        public decimal PurchasePrice { get; set; }

        [Range(0, double.MaxValue)]
        public decimal AcquisitionCost { get; set; }

        public int UsefulLifeYears { get; set; }
        public decimal? CurrentBookValue { get; set; }
        public decimal? ResidualValue { get; set; }
    }

    public class AllocateAssetDto
    {
        [Required]
        public string Room { get; set; } = string.Empty;
    }

    public class AllocateAssetRequestDto
    {
        [Required]
        public string AssetId { get; set; } = string.Empty;

        [Required]
        public string RoomId { get; set; } = string.Empty;

        public string? Remarks { get; set; }
    }

    public class AssetAllocationResponseDto
    {
        public string Id { get; set; } = string.Empty;
        public string AssetId { get; set; } = string.Empty;
        public string AssetName { get; set; } = string.Empty;
        public string? AssetCode { get; set; }
        public string? TagNumber { get; set; }
        public string RoomId { get; set; } = string.Empty;
        public string RoomCode { get; set; } = string.Empty;
        public string RoomName { get; set; } = string.Empty;
        public string? RoomCategoryName { get; set; }
        public string? PreviousRoomId { get; set; }
        public string Status { get; set; } = string.Empty;
        public string? Remarks { get; set; }
        public DateTime AllocatedAt { get; set; }
        public DateTime? DeallocatedAt { get; set; }
        public string? AllocatedByName { get; set; }
        public int? TenantId { get; set; }
    }

    public class AssetResponseDto
    {
        public string Id { get; set; } = string.Empty;
        public string AssetCode { get; set; } = string.Empty;
        public string? TagNumber { get; set; }
        public string AssetName { get; set; } = string.Empty;
        public string? CategoryId { get; set; }
        public string? CategoryName { get; set; }
        public HandlingType? HandlingType { get; set; }
        public string? CategoryDisplayName { get; set; }
        public LifecycleStatus LifecycleStatus { get; set; }
        public string Status { get; set; } = string.Empty; // Human-readable label
        public AssetCondition CurrentCondition { get; set; }
        public string ConditionLabel { get; set; } = string.Empty;
        public string? Room { get; set; }
        public string? RoomId { get; set; }
        public string? RoomCode { get; set; }
        public string? RoomName { get; set; }
        /// <summary>Room unit category (from active allocation), when loaded.</summary>
        public string? RoomCategoryName { get; set; }
        /// <summary>Room unit sub-category (from active allocation), when loaded.</summary>
        public string? RoomSubCategoryName { get; set; }
        public string AllocationState { get; set; } = "Unassigned";
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
        public bool IsSalvageOverride { get; set; }
        public decimal CurrentBookValue { get; set; }
        public decimal MonthlyDepreciation { get; set; }
        public int? TenantId { get; set; }
        public DateTime? WarrantyExpiry { get; set; }
        public string? Notes { get; set; }
        public string? Documents { get; set; }
        public bool IsArchived { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public string? CreatedByName { get; set; }
        public string? UpdatedByName { get; set; }
        public byte[]? RowVersion { get; set; }
        public string? PurchaseOrderId { get; set; }
    }
}
