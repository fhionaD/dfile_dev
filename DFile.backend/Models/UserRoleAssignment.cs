using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DFile.backend.Models
{
    /// <summary>
    /// Links a User to a TenantRole, representing their role within a specific tenant.
    /// </summary>
    public class UserRoleAssignment
    {
        [Key]
        public int Id { get; set; }

        [Required]
        public int UserId { get; set; }

        [ForeignKey("UserId")]
        public User User { get; set; } = null!;

        public int TenantRoleId { get; set; }

        [ForeignKey("TenantRoleId")]
        public TenantRole TenantRole { get; set; } = null!;

        public DateTime AssignedAt { get; set; } = DateTime.UtcNow;
    }
}
