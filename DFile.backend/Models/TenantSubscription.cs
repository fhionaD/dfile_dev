using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DFile.backend.Models
{
    public enum BillingCycle
    {
        Monthly,
        Yearly
    }

    public enum SubscriptionStatus
    {
        Active,
        Expiring,
        Expired,
        Suspended
    }

    public class TenantSubscription
    {
        [Key]
        public int Id { get; set; }

        public int TenantId { get; set; }

        public int PlanId { get; set; }

        [MaxLength(20)]
        public BillingCycle BillingCycle { get; set; }

        public DateTime StartDate { get; set; }

        public DateTime EndDate { get; set; }

        [MaxLength(20)]
        public SubscriptionStatus Status { get; set; } = SubscriptionStatus.Active;

        /// <summary>Null for free plans; FK to PaymentTransaction.Id for paid plans.</summary>
        [MaxLength(64)]
        public string? PaymentTransactionId { get; set; }

        /// <summary>True when this subscription was activated without payment (free tier).</summary>
        public bool IsFreePlan { get; set; }

        // Idempotency guards — prevent duplicate expiry reminder emails/in-app notifications
        public DateTime? NotifiedAt7Days { get; set; }
        public DateTime? NotifiedAt3Days { get; set; }
        public DateTime? NotifiedAt1Day { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Navigation
        [ForeignKey(nameof(TenantId))]
        public Tenant Tenant { get; set; } = null!;

        [ForeignKey(nameof(PlanId))]
        public Plan Plan { get; set; } = null!;

        [ForeignKey(nameof(PaymentTransactionId))]
        public PaymentTransaction? PaymentTransaction { get; set; }
    }
}
