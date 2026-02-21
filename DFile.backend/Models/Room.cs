using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

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
        
        // Navigation property
        [ForeignKey("CategoryId")]
        public RoomCategory? RoomCategory { get; set; }
        
        public string? CategoryId { get; set; }
        
        public string Status { get; set; } = "Available"; // Available, Occupied, Maintenance
        
        public int MaxOccupancy { get; set; }
        
        public bool Archived { get; set; }
        
        public int? TenantId { get; set; }
    }
}
