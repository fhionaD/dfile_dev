using System.ComponentModel.DataAnnotations;
using DFile.backend.Models;

namespace DFile.backend.DTOs
{
    public class CreateTenantDto
    {
        [Required]
        public string TenantName { get; set; } = string.Empty;

        [Required]
        public string AdminName { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        public string AdminEmail { get; set; } = string.Empty;

        [Required]
        [MinLength(6)]
        public string AdminPassword { get; set; } = string.Empty;

        [Required]
        public SubscriptionPlanType SubscriptionPlan { get; set; }
    }
}
