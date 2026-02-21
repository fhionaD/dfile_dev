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

        public string Type { get; set; } = "Tangible"; // Tangible, Intangible, etc.

        public string Status { get; set; } = "Active"; // Active, Archived

        // Navigation property if we want to link Assets directly later
        // public ICollection<Asset> Assets { get; set; } = new List<Asset>();
    }
}
