using System.ComponentModel.DataAnnotations;

namespace DFile.backend.DTOs
{
    public class CreateEmployeeDto : IValidatableObject
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
        public string Department { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;

        [Required]
        public DateTime HireDate { get; set; }

        public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
        {
            if (HireDate.Date > DateTime.UtcNow.Date)
                yield return new ValidationResult("Hire date cannot be in the future.", new[] { nameof(HireDate) });
        }
    }

    public class UpdateEmployeeDto : IValidatableObject
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
        public string Department { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;

        [Required]
        public DateTime HireDate { get; set; }

        public string Status { get; set; } = "Active";

        public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
        {
            if (HireDate.Date > DateTime.UtcNow.Date)
                yield return new ValidationResult("Hire date cannot be in the future.", new[] { nameof(HireDate) });
        }
    }
}
