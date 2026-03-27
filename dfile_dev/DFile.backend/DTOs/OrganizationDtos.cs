using System.ComponentModel.DataAnnotations;

namespace DFile.backend.DTOs
{
    public class CreateDepartmentDto
    {
        [Required]
        public string Name { get; set; } = string.Empty;

        public string Description { get; set; } = string.Empty;

        public string? ParentDepartmentId { get; set; }
    }

    public class UpdateDepartmentDto
    {
        [Required]
        public string Name { get; set; } = string.Empty;

        public string Description { get; set; } = string.Empty;

        public string? ParentDepartmentId { get; set; }
    }

    public class DepartmentResponseDto
    {
        public string Id { get; set; } = string.Empty;
        public string DepartmentCode { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string? ParentDepartmentId { get; set; }
        public string? ParentDepartmentName { get; set; }
        public bool IsArchived { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public string? CreatedByName { get; set; }
        public string? UpdatedByName { get; set; }
        public int? TenantId { get; set; }
    }

    public class CreateRoleDto
    {
        [Required]
        public string Designation { get; set; } = string.Empty;

        public string? DepartmentId { get; set; }
        public string Description { get; set; } = string.Empty;
    }

    public class UpdateRoleDto
    {
        [Required]
        public string Designation { get; set; } = string.Empty;

        public string? DepartmentId { get; set; }
        public string Description { get; set; } = string.Empty;
    }

    public class RoleResponseDto
    {
        public string Id { get; set; } = string.Empty;
        public string RoleCode { get; set; } = string.Empty;
        public string Designation { get; set; } = string.Empty;
        public string? DepartmentId { get; set; }
        public string DepartmentName { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime? EditedAt { get; set; }
    }
}
