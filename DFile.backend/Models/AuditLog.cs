using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DFile.backend.Models
{
    public class AuditLog
    {
        [Key]
        public long Id { get; set; }

        [Required]
        public string Action { get; set; } = string.Empty; // Create | Update | Delete | Archive | Login | Logout

        [Required]
        public string EntityType { get; set; } = string.Empty; // Asset, PurchaseOrder, MaintenanceRecord, etc.

        public string? EntityId { get; set; }

        public int? UserId { get; set; }

        [ForeignKey("UserId")]
        public User? User { get; set; }

        public int? TenantId { get; set; }

        [ForeignKey("TenantId")]
        public Tenant? Tenant { get; set; }

        public string? OldValues { get; set; } // JSON snapshot before change
        public string? NewValues { get; set; } // JSON snapshot after change

        public string? Module { get; set; }

        public string? IpAddress { get; set; }

        public string? UserAgent { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
