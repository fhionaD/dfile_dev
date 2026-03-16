using System.ComponentModel.DataAnnotations;

namespace DFile.backend.Models
{
    /// <summary>
    /// Global role template (e.g. Admin, Finance Manager, Maintenance Manager).
    /// Defines a set of permissions that can be assigned to tenant users.
    /// System templates are seeded and cannot be deleted by tenants.
    /// </summary>
    public class RoleTemplate
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        [MaxLength(500)]
        public string? Description { get; set; }

        /// <summary>
        /// System templates (seeded) cannot be deleted. Tenants can create custom ones.
        /// </summary>
        public bool IsSystem { get; set; } = false;

        public bool IsArchived { get; set; } = false;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public ICollection<RolePermission> Permissions { get; set; } = new List<RolePermission>();
        public ICollection<TenantRole> TenantRoles { get; set; } = new List<TenantRole>();
    }
}
