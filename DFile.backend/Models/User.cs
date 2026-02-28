using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace DFile.backend.Models
{
    public class User
    {
        public int Id { get; set; }
        [Required]
        public string Name { get; set; } = string.Empty;
        [Required]
        public string Email { get; set; } = string.Empty;
        
        [JsonIgnore]
        public string PasswordHash { get; set; } = string.Empty;
        
        public string Role { get; set; } = "Employee"; // Admin, Maintenance, Finance, Super Admin
        public string RoleLabel { get; set; } = string.Empty;
        public string? Avatar { get; set; }
        public int? TenantId { get; set; }
        public bool MustChangePassword { get; set; } = false;
    }
}
