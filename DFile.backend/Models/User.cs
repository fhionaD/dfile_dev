using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;


namespace DFile.backend.Models
{
    public class User
    {
        public int Id { get; set; }

        [Required]
        public string FirstName { get; set; } = string.Empty;

        public string? MiddleName { get; set; }

        [Required]
        public string LastName { get; set; } = string.Empty;

        /// <summary>AES-256-GCM encrypted email address (nonce.ciphertext.tag, base64). Never expose the raw ciphertext externally.</summary>
        [Required]
        public string Email { get; set; } = string.Empty;

        /// <summary>HMAC-SHA256 hex of the normalized (lowercase) email. Used for indexed database lookups.</summary>
        [MaxLength(64)]
        public string? EmailHash { get; set; }

        [JsonIgnore]
        public string PasswordHash { get; set; } = string.Empty;

        public string Role { get; set; } = "Admin"; // Super Admin, Admin, Finance Manager, Maintenance Manager
        public string RoleLabel { get; set; } = string.Empty;
        public string? ContactNumber { get; set; }
        public string? Address { get; set; }
        public DateTime? HireDate { get; set; }
        public string Status { get; set; } = "Active"; // Active, Inactive, Archived, PendingActivation
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [JsonIgnore]
        public string? ActivationTokenHash { get; set; }

        public DateTime? ActivationTokenExpiry { get; set; }

        public int? TenantId { get; set; }

        [ForeignKey("TenantId")]
        public Tenant? Tenant { get; set; }

        // Login security fields
        public int FailedLoginAttempts { get; set; }
        public DateTime? LockoutEnd { get; set; }
    }
}
