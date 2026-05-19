using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DFile.backend.Models
{
    public class UserLoginAudit
    {
        public int Id { get; set; }

        public int? UserId { get; set; }

        [ForeignKey("UserId")]
        public User? User { get; set; }

        [MaxLength(255)]
        public string? Email { get; set; }

        [Required]
        [MaxLength(50)]
        public string AttemptStatus { get; set; } = string.Empty; // LOGIN_SUCCESS, LOGIN_FAILED, LOGIN_LOCKED, SUSPICIOUS_LOGIN, NEW_DEVICE_LOGIN

        [MaxLength(100)]
        public string? IpAddress { get; set; }

        public string? UserAgent { get; set; }

        public DateTime AttemptedAt { get; set; } = DateTime.UtcNow;

        [MaxLength(255)]
        public string? FailureReason { get; set; }

        public bool IsSuspicious { get; set; }

        public int? TenantId { get; set; }

        [ForeignKey("TenantId")]
        public Tenant? Tenant { get; set; }
    }
}
