using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DFile.backend.Models
{
    /// <summary>
    /// Tenant-specific instance of a RoleTemplate.
    /// Tenants can assign RoleTemplates to their users and optionally rename them via CustomLabel.
    /// </summary>
    public class TenantRole
    {
        [Key]
        public int Id { get; set; }

        public int TenantId { get; set; }

        [ForeignKey("TenantId")]
        public Tenant Tenant { get; set; } = null!;

        public int RoleTemplateId { get; set; }

        [ForeignKey("RoleTemplateId")]
        public RoleTemplate RoleTemplate { get; set; } = null!;

        /// <summary>
        /// Optional tenant-specific label (e.g. "Head of Finance" instead of "Finance Manager").
        /// </summary>
        [MaxLength(100)]
        public string? CustomLabel { get; set; }

        public ICollection<UserRoleAssignment> UserAssignments { get; set; } = new List<UserRoleAssignment>();
    }
}
