using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DFile.backend.Models
{
    public class PurchaseOrderItem
    {
        [Key]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        [Required]
        public string PurchaseOrderId { get; set; } = string.Empty;

        [ForeignKey("PurchaseOrderId")]
        public PurchaseOrder? PurchaseOrder { get; set; }

        [Required]
        public string Description { get; set; } = string.Empty;

        public string? CategoryId { get; set; }

        [ForeignKey("CategoryId")]
        public AssetCategory? Category { get; set; }

        public int Quantity { get; set; } = 1;

        public decimal UnitCost { get; set; }

        public decimal TotalCost { get; set; }
    }
}
