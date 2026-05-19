using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DFile.backend.Models
{
    /// <summary>
    /// Billing plan that tenants can subscribe to.
    /// Defines subscription cost and feature limits for the tenant.
    /// </summary>
    public class Plan
    {
        [Key]
        public int Id { get; set; }

        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty; // Starter, Basic, Pro, etc.

        [MaxLength(500)]
        public string? Description { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal MonthlyCost { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal YearlyCost { get; set; }

        public int MaxRooms { get; set; }
        public int MaxPersonnel { get; set; }
        
        public bool CanCreateFinanceManager { get; set; }
        public bool CanCreateMaintenanceManager { get; set; }

        // Feature flags for modules
        public bool AssetTracking { get; set; } = true;
        public bool Depreciation { get; set; } = true;
        public bool MaintenanceModule { get; set; }
        public bool ReportsModule { get; set; }
        public bool ProcurementModule { get; set; }

        public bool IsActive { get; set; } = true;
        public bool IsArchived { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        public ICollection<Tenant> Tenants { get; set; } = new List<Tenant>();
        public ICollection<PaymentTransaction> PaymentTransactions { get; set; } = new List<PaymentTransaction>();
    }
}
