using System.ComponentModel.DataAnnotations;

namespace DFile.backend.Models
{
    public class RoomCategory
    {
        public string Id { get; set; } = string.Empty;
        
        [Required]
        public string Name { get; set; } = string.Empty;
        
        public string SubCategory { get; set; } = string.Empty;
        
        public string Description { get; set; } = string.Empty;
        
        public decimal BaseRate { get; set; }
        
        public int MaxOccupancy { get; set; }
        
        public string Status { get; set; } = "Active";
        
        public bool Archived { get; set; }
        
        public int? TenantId { get; set; } // For multi-tenancy
    }
}
