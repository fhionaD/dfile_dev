using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DFile.backend.Models
{
    public class PaymentTransaction
    {
        [Key]
        [MaxLength(64)]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        public int TenantId { get; set; }

        [ForeignKey(nameof(TenantId))]
        public Tenant? Tenant { get; set; }

        public int AmountCents { get; set; }

        [MaxLength(8)]
        public string Currency { get; set; } = "PHP";

        [MaxLength(500)]
        public string Description { get; set; } = string.Empty;

        [MaxLength(32)]
        public string Provider { get; set; } = "PayMongo";

        /// <summary>Pending, Paid, Failed, Cancelled, Expired</summary>
        [MaxLength(32)]
        public string Status { get; set; } = "Pending";

        [MaxLength(128)]
        public string? CheckoutSessionId { get; set; }

        [MaxLength(128)]
        public string? PaymentIntentId { get; set; }

        [MaxLength(128)]
        public string ReferenceNumber { get; set; } = string.Empty;

        /// <summary>FK to Plan.Id — which plan is being paid for.</summary>
        public int PlanId { get; set; }

        [ForeignKey(nameof(PlanId))]
        public Plan? Plan { get; set; }

        /// <summary>Subscription plan name (Starter, Basic, Pro) — NOT NULL, denormalized from Plan.Name.</summary>
        [Required]
        [MaxLength(100)]
        public string SubscriptionPlanCode { get; set; } = string.Empty;

        /// <summary>"Monthly" or "Yearly" — billing cycle selected at checkout.</summary>
        [MaxLength(20)]
        public string BillingCycle { get; set; } = "Monthly";

        [MaxLength(2000)]
        public string? LastError { get; set; }

        [MaxLength(128)]
        public string? LastEventType { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
