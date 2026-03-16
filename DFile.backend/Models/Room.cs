using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DFile.backend.Models
{
    public class Room
    {
        public string Id { get; set; } = string.Empty;

        [Required]
        public string RoomCode { get; set; } = string.Empty;
        
        [Required]
        public string Name { get; set; } = string.Empty;

        public string Floor { get; set; } = string.Empty;

        [ForeignKey("CategoryId")]
        public RoomCategory? RoomCategory { get; set; }

        public string? CategoryId { get; set; }

        [ForeignKey("SubCategoryId")]
        public RoomSubCategory? RoomSubCategory { get; set; }

        public string? SubCategoryId { get; set; }

        public bool IsArchived { get; set; }

        public int? TenantId { get; set; }

        [ForeignKey("TenantId")]
        public Tenant? Tenant { get; set; }

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
