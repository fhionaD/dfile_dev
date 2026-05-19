using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DFile.backend.Models
{
    public enum SubscriptionPlanType
    {
        Starter,
        Basic,
        Pro
    }

    public class Tenant
    {
        public int Id { get; set; }
        [Required]
        public string Name { get; set; } = string.Empty;
        public string BusinessAddress { get; set; } = string.Empty;
        public SubscriptionPlanType SubscriptionPlan { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        public string Status { get; set; } = "Active";
        
        // Reference to the billing plan (can be null for backward compatibility)
        public int? PlanId { get; set; }

        /// <summary>True once the tenant has activated the free plan. Free plan cannot be re-used after this is set.</summary>
        public bool HasUsedFreePlan { get; set; }

        [ForeignKey("PlanId")]
        public Plan? Plan { get; set; }

        // Limits based on plan (stored for custom overrides by super admin)
        public int MaxRooms { get; set; }
        public int MaxPersonnel { get; set; }
        public bool AssetTracking { get; set; }
        public bool Depreciation { get; set; }
        public bool MaintenanceModule { get; set; }
        public string ReportsLevel { get; set; } = "Standard"; // Standard, Able (Advanced)

        public static Tenant Create(string name, SubscriptionPlanType plan)
        {
            var tenant = new Tenant
            {
                Name = name,
                SubscriptionPlan = plan,
                AssetTracking = true, // All plans have this
                Depreciation = true   // All plans have this
            };

            switch (plan)
            {
                case SubscriptionPlanType.Starter:
                    tenant.MaxRooms = 20;
                    tenant.MaxPersonnel = 10;
                    tenant.MaintenanceModule = false;
                    tenant.ReportsLevel = "Standard";
                    break;
                case SubscriptionPlanType.Basic:
                    tenant.MaxRooms = 100;
                    tenant.MaxPersonnel = 30;
                    tenant.MaintenanceModule = true; // "Able"
                    tenant.ReportsLevel = "Standard";
                    break;
                case SubscriptionPlanType.Pro:
                    tenant.MaxRooms = 200;
                    tenant.MaxPersonnel = 200;
                    tenant.MaintenanceModule = true; // "Able"
                    tenant.ReportsLevel = "Able";
                    break;
            }

            return tenant;
        }
    }
}
