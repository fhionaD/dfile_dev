using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DFile.backend.Models
{
    public class Role
    {
        [Key]
        public string Id { get; set; } = string.Empty;

        [Required]
        public string RoleCode { get; set; } = string.Empty;

        [Required]
        public string Designation { get; set; } = string.Empty;

        public string? DepartmentId { get; set; }

        [ForeignKey("DepartmentId")]
        public Department? Department { get; set; }

        public string Description { get; set; } = string.Empty;
        public string Status { get; set; } = "Active"; // Active | Archived
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? EditedAt { get; set; }
        public int? TenantId { get; set; }

        [ForeignKey("TenantId")]
        public Tenant? Tenant { get; set; }
    }
}
