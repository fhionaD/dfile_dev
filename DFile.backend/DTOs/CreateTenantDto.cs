using System.ComponentModel.DataAnnotations;
using DFile.backend.Models;

namespace DFile.backend.DTOs
{
    public class CreateTenantDto
    {
        [Required]
        public string TenantName { get; set; } = string.Empty;

        public string BusinessAddress { get; set; } = string.Empty;

        [Required]
        public string AdminFirstName { get; set; } = string.Empty;

        [Required]
        public string AdminLastName { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        public string AdminEmail { get; set; } = string.Empty;

        [Required]
        [MinLength(15)]
        public string AdminPassword { get; set; } = string.Empty;

        [Required]
        public SubscriptionPlanType SubscriptionPlan { get; set; }

        /// <summary>
        /// DB Plan.Id selected from /api/plans/public. When provided, overrides SubscriptionPlan and
        /// triggers the plan-based creation path (free plan activates immediately; paid plan creates
        /// a PayMongo checkout session and returns 202 with the checkout URL).
        /// </summary>
        public int? PlanId { get; set; }

        /// <summary>"Monthly" or "Yearly" — used when PlanId is set and the plan is paid. Defaults to Monthly.</summary>
        public string BillingCycle { get; set; } = "Monthly";
    }
}
