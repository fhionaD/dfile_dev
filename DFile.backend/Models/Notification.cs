using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DFile.backend.Models
{
    public class Notification
    {
        [Key]
        public long Id { get; set; }

        [Required]
        [MaxLength(500)]
        public string Message { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        public string Type { get; set; } = "Info"; // Info | Warning | Success | Error

        [MaxLength(100)]
        public string? Module { get; set; } // Asset, Maintenance, Procurement, etc.

        [MaxLength(100)]
        public string? EntityType { get; set; }

        public string? EntityId { get; set; }

        public int? UserId { get; set; }

        [ForeignKey("UserId")]
        public User? User { get; set; }

        [MaxLength(50)]
        public string? TargetRole { get; set; } // null = all roles in tenant

        public int? TenantId { get; set; }

        [ForeignKey("TenantId")]
        public Tenant? Tenant { get; set; }

        public bool IsRead { get; set; } = false;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? ReadAt { get; set; }
    }
}
