using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DFile.backend.Models
{
    /// <summary>
    /// Per-module permission flags for a RoleTemplate.
    /// Each row represents what a role can do on a specific module.
    /// </summary>
    public class RolePermission
    {
        [Key]
        public int Id { get; set; }

        public int RoleTemplateId { get; set; }

        [ForeignKey("RoleTemplateId")]
        public RoleTemplate RoleTemplate { get; set; } = null!;

        [Required]
        [MaxLength(50)]
        public string ModuleName { get; set; } = string.Empty; // Assets, Rooms, PurchaseOrders, Maintenance, Departments, Employees, Tasks, Reports

        public bool CanView { get; set; } = false;
        public bool CanCreate { get; set; } = false;
        public bool CanEdit { get; set; } = false;
        public bool CanApprove { get; set; } = false;
        public bool CanArchive { get; set; } = false;
    }
}
