using System.ComponentModel.DataAnnotations;

namespace DFile.backend.DTOs
{
    /// <summary>Checkout for a paid subscription plan. Plan must be active and not archived.</summary>
    public class CreatePayMongoCheckoutDto
    {
        /// <summary>Plan name (e.g., "Basic", "Pro") — required.</summary>
        [Required(ErrorMessage = "Plan code is required")]
        [MaxLength(100)]
        public string? PlanCode { get; set; }

        /// <summary>"Monthly" or "Yearly" — determines amount charged and subscription duration.</summary>
        [Required(ErrorMessage = "Billing cycle is required")]
        [RegularExpression("^(Monthly|Yearly)$", ErrorMessage = "BillingCycle must be 'Monthly' or 'Yearly'.")]
        public string BillingCycle { get; set; } = "Monthly";
    }

    public class BillingPlanOptionDto
    {
        public int Plan { get; set; }
        public string Code { get; set; } = string.Empty;
        public string DisplayName { get; set; } = string.Empty;
        /// <summary>Monthly price in PHP pesos.</summary>
        public int PricePesos { get; set; }
        /// <summary>Monthly price in centavos.</summary>
        public int AmountCents { get; set; }
        /// <summary>Yearly price in PHP pesos.</summary>
        public int YearlyPricePesos { get; set; }
        /// <summary>Yearly price in centavos.</summary>
        public int YearlyAmountCents { get; set; }
        public string Summary { get; set; } = string.Empty;
        /// <summary>True when MonthlyCost == 0 (free tier).</summary>
        public bool IsFreePlan { get; set; }
    }

    public class SubscriptionStatusDto
    {
        public int Id { get; set; }
        public string PlanName { get; set; } = string.Empty;
        public string BillingCycle { get; set; } = string.Empty;
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public string Status { get; set; } = string.Empty;
        /// <summary>Days remaining until EndDate. Negative means already expired.</summary>
        public int DaysUntilExpiry { get; set; }
    }

    public class BillingPlansResponseDto
    {
        public string CurrentPlanCode { get; set; } = string.Empty;
        public int CurrentPlan { get; set; }
        /// <summary>True if the tenant has previously activated the free plan — blocks re-selection.</summary>
        public bool HasUsedFreePlan { get; set; }
        /// <summary>Active or expiring subscription detail for the countdown display. Null when no subscription exists.</summary>
        public SubscriptionStatusDto? CurrentSubscription { get; set; }
        public List<BillingPlanOptionDto> Plans { get; set; } = new();
    }

    public class PayMongoCheckoutResponseDto
    {
        public string PaymentId { get; set; } = string.Empty;
        public string CheckoutUrl { get; set; } = string.Empty;
    }

    public class PaymentTransactionResponseDto
    {
        public string Id { get; set; } = string.Empty;
        public int TenantId { get; set; }
        public int AmountCents { get; set; }
        public string Currency { get; set; } = "PHP";
        public string Description { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string? CheckoutSessionId { get; set; }
        public string ReferenceNumber { get; set; } = string.Empty;
        public string? SubscriptionPlanCode { get; set; }
        public string? LastError { get; set; }
        public string? LastEventType { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}
