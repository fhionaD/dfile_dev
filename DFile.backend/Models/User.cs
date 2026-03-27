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

        [Required]
        public string LastName { get; set; } = string.Empty;

        [Required]
        public string Email { get; set; } = string.Empty;

        [JsonIgnore]
        public string PasswordHash { get; set; } = string.Empty;

        public string Role { get; set; } = "Admin"; // Super Admin, Admin, Finance, Maintenance
        public string RoleLabel { get; set; } = string.Empty;
        public string? Avatar { get; set; }
        public string Status { get; set; } = "Active"; // Active, Inactive, Archived
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public int? TenantId { get; set; }

        [ForeignKey("TenantId")]
        public Tenant? Tenant { get; set; }
    }
}
