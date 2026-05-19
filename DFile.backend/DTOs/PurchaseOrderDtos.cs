using System.ComponentModel.DataAnnotations;

namespace DFile.backend.DTOs
{
    public class CreatePurchaseOrderDto
    {
        [Required]
        public string AssetName { get; set; } = string.Empty;

        public string Category { get; set; } = string.Empty;
        public string? Vendor { get; set; }
        public string? Manufacturer { get; set; }
        public string? Model { get; set; }
        public string? SerialNumber { get; set; }
        public decimal PurchasePrice { get; set; }
        public DateTime? PurchaseDate { get; set; }
        
        /// <summary>Total useful life in MONTHS (not years). E.g., 60 months = 5 years.</summary>
        [Required]
        [Range(1, int.MaxValue, ErrorMessage = "Useful life must be at least 1 month.")]
        public int UsefulLifeMonths { get; set; }
        
        public string? RequestedBy { get; set; }
        public string? MaintenanceRecordId { get; set; }
        public List<PurchaseOrderItemDto>? Items { get; set; }
    }

    public class UpdatePurchaseOrderDto
    {
        [Required]
        public string AssetName { get; set; } = string.Empty;

        public string Category { get; set; } = string.Empty;
        public string? Vendor { get; set; }
        public string? Manufacturer { get; set; }
        public string? Model { get; set; }
        public string? SerialNumber { get; set; }
        public decimal PurchasePrice { get; set; }
        public DateTime? PurchaseDate { get; set; }
        
        /// <summary>Total useful life in MONTHS (not years). E.g., 60 months = 5 years.</summary>
        [Range(1, int.MaxValue, ErrorMessage = "Useful life must be at least 1 month.")]
        public int UsefulLifeMonths { get; set; }
        
        public string Status { get; set; } = "Pending";
        public string? RequestedBy { get; set; }
        public string? AssetId { get; set; }
        public List<PurchaseOrderItemDto>? Items { get; set; }
    }

    public class PurchaseOrderItemDto
    {
        public string? Id { get; set; }

        [Required]
        public string Description { get; set; } = string.Empty;

        public string? CategoryId { get; set; }
        public int Quantity { get; set; } = 1;
        public decimal UnitCost { get; set; }
        public decimal TotalCost { get; set; }
    }

    public class PurchaseOrderResponseDto
    {
        public string Id { get; set; } = string.Empty;
        public string OrderCode { get; set; } = string.Empty;
        public string AssetName { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public string? Vendor { get; set; }
        public string? Manufacturer { get; set; }
        public string? Model { get; set; }
        public string? SerialNumber { get; set; }
        public decimal PurchasePrice { get; set; }
        public DateTime? PurchaseDate { get; set; }
        
        /// <summary>Total useful life in MONTHS (primary storage).</summary>
        public int UsefulLifeMonths { get; set; }
        
        /// <summary>UsefulLifeMonths / 12, for backward compatibility and display.</summary>
        public decimal UsefulLifeYears => Math.Round((decimal)UsefulLifeMonths / 12M, 2);
        
        public string Status { get; set; } = string.Empty;
        public string? RequestedBy { get; set; }
        public string? AssetId { get; set; }
        public int? ApprovedBy { get; set; }
        public string? ApprovedByName { get; set; }
        public DateTime? ApprovedAt { get; set; }
        public bool IsArchived { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public int? TenantId { get; set; }
        public string? MaintenanceRecordId { get; set; }
        public List<PurchaseOrderItemDto>? Items { get; set; }
    }

    public class ReceivePurchaseOrderDto
    {
        [Required]
        public DateTime DeliveryDate { get; set; }

        public string? CategoryId { get; set; }
    }
}
