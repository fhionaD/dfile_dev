using System.ComponentModel.DataAnnotations;

namespace DFile.backend.Models
{
    public class AssetCategory
    {
        [Key]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        [Required]
        public string Name { get; set; } = string.Empty;

        public string Description { get; set; } = string.Empty;

        [Required]
        public string HandlingType { get; set; } = "Fixed"; // Consumable, Movable, Fixed

        public string Status { get; set; } = "Active"; // Active, Archived

        public int? TenantId { get; set; }

        // Metadata fields
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public string? CreatedBy { get; set; }
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        public string? UpdatedBy { get; set; }

        // Archival fields
        public bool IsArchived { get; set; } = false;
        public DateTime? ArchivedAt { get; set; }
        public string? ArchivedBy { get; set; }

        // Navigation property if we want to link Assets directly later
        // public ICollection<Asset> Assets { get; set; } = new List<Asset>();
    }
}
