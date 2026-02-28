using System.ComponentModel.DataAnnotations;

namespace DFile.backend.Models
{
    public class PurchaseOrder
    {
        public string Id { get; set; } = string.Empty;
        
        [Required]
        public string AssetName { get; set; } = string.Empty;
        
        [Required]
        public string Category { get; set; } = string.Empty;
        
        public string? Vendor { get; set; }
        public string? Manufacturer { get; set; }
        public string? Model { get; set; }
        public string? SerialNumber { get; set; }
        
        [Required]
        public decimal PurchasePrice { get; set; }
        
        public string? PurchaseDate { get; set; }
        public int UsefulLifeYears { get; set; } = 5;
        
        [Required]
        public string Status { get; set; } = "Pending"; // Pending, Approved, Delivered, Cancelled
        
        public string? RequestedBy { get; set; }
        public string? AssetId { get; set; } // Linked asset ID once delivered
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public bool Archived { get; set; } = false;
        
        public int? TenantId { get; set; }
    }
}
