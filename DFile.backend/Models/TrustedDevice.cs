using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DFile.backend.Models
{
    public class TrustedDevice
    {
        public int Id { get; set; }

        [Required]
        public int UserId { get; set; }

        [ForeignKey("UserId")]
        public User User { get; set; } = null!;

        [MaxLength(500)]
        public string? DeviceFingerprint { get; set; }

        [MaxLength(100)]
        public string? IpAddress { get; set; }

        public string? UserAgent { get; set; }

        public DateTime LastUsedAt { get; set; } = DateTime.UtcNow;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
