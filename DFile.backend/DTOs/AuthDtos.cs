using System.ComponentModel.DataAnnotations;
using System.Collections.Generic;

namespace DFile.backend.DTOs
{
    public class LoginDto
    {
        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required]
        public string Password { get; set; } = string.Empty;
    }

    public class RegisterDto
    {
        [Required]
        public string FirstName { get; set; } = string.Empty;

        [Required]
        public string LastName { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required]
        [MinLength(6)]
        public string Password { get; set; } = string.Empty;

        [Required]
        public int RoleTemplateId { get; set; }

        public int? TenantId { get; set; }
    }

    public class UserResponseDto
    {
        public int Id { get; set; }
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public string RoleLabel { get; set; } = string.Empty;
        public string? Avatar { get; set; }
        public string Status { get; set; } = string.Empty;
        public int? TenantId { get; set; }
        public List<ModulePermissionDto>? Permissions { get; set; }
    }

    public class ModulePermissionDto
    {
        public string ModuleName { get; set; } = string.Empty;
        public bool CanView { get; set; }
        public bool CanCreate { get; set; }
        public bool CanEdit { get; set; }
        public bool CanApprove { get; set; }
        public bool CanArchive { get; set; }
    }
}
