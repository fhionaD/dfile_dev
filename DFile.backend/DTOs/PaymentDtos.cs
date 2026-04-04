using System.ComponentModel.DataAnnotations;

namespace DFile.backend.DTOs
{
    /// <summary>Checkout for a subscription tier. Amount is determined server-side from the plan (test pricing).</summary>
    public class CreatePayMongoCheckoutDto
    {
        /// <summary>0 = Starter, 1 = Basic, 2 = Pro. Omit to bill the tenant's current plan.</summary>
        [Range(0, 2)]
        public int? SubscriptionPlan { get; set; }
    }

    public class BillingPlanOptionDto
    {
        public int Plan { get; set; }
        public string Code { get; set; } = string.Empty;
        public string DisplayName { get; set; } = string.Empty;
        public int PricePesos { get; set; }
        public int AmountCents { get; set; }
        public string Summary { get; set; } = string.Empty;
    }

    public class BillingPlansResponseDto
    {
        public string CurrentPlanCode { get; set; } = string.Empty;
        public int CurrentPlan { get; set; }
        public List<BillingPlanOptionDto> Plans { get; set; } = new();
        /// <summary>Shown in UI — prices are for integration testing.</summary>
        public string PricingNote { get; set; } = "Prices shown are test values for billing integration.";
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
