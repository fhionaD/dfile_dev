using System.ComponentModel.DataAnnotations;

namespace DFile.backend.Models
{
    public class Room
    {
        public string Id { get; set; } = string.Empty;
        
        [Required]
        public string UnitId { get; set; } = string.Empty;
        
        [Required]
        public string Name { get; set; } = string.Empty;
        
        public string Floor { get; set; } = string.Empty;
        
        public string CategoryId { get; set; } = string.Empty;
        
        public string Status { get; set; } = "Available"; // Available, Occupied, Maintenance
        
        public int MaxOccupancy { get; set; }
        
        public bool Archived { get; set; }
        
        public int? TenantId { get; set; }
    }
}
