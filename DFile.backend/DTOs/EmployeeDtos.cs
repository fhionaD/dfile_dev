using System.ComponentModel.DataAnnotations;

namespace DFile.backend.DTOs
{
    public class CreateEmployeeDto
    {
        [Required]
        public string FirstName { get; set; } = string.Empty;

        public string? MiddleName { get; set; }

        [Required]
        public string LastName { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        public string ContactNumber { get; set; } = string.Empty;

        public string? Address { get; set; }

        [Required]
        public string Role { get; set; } = string.Empty;

        [Required]
        public DateTime HireDate { get; set; }
    }

    public class UpdateEmployeeDto
    {
        [Required]
        public string FirstName { get; set; } = string.Empty;

        public string? MiddleName { get; set; }

        [Required]
        public string LastName { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        public string ContactNumber { get; set; } = string.Empty;
        
        [Required]
        public string Role { get; set; } = string.Empty;

        [Required]
        public DateTime HireDate { get; set; }

        public string Status { get; set; } = "Active";
    }
}
