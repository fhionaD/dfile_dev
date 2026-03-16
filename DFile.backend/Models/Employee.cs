using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DFile.backend.Models
{
    public class Employee
    {
        [Key]
        public string Id { get; set; } = string.Empty;

        [Required]
        public string EmployeeCode { get; set; } = string.Empty;

        [Required]
        public string FirstName { get; set; } = string.Empty;
        public string? MiddleName { get; set; }
        public string LastName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string ContactNumber { get; set; } = string.Empty;
        public string Department { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public DateTime HireDate { get; set; }
        public string Status { get; set; } = "Active";
        public bool Archived { get; set; } = false;
        public int? TenantId { get; set; }

        [ForeignKey("TenantId")]
        public Tenant? Tenant { get; set; }
    }
}
