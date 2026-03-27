using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DFile.backend.Models
{
    public class AssetConditionLog
    {
        [Key]
        public long Id { get; set; }

        [Required]
        public string AssetId { get; set; } = string.Empty;

        [ForeignKey("AssetId")]
        public Asset? Asset { get; set; }

        public AssetCondition PreviousCondition { get; set; }
        public AssetCondition NewCondition { get; set; }

        [MaxLength(500)]
        public string? Notes { get; set; }

        [MaxLength(100)]
        public string? ChangedBy { get; set; }

        public int? TenantId { get; set; }

        [ForeignKey("TenantId")]
        public Tenant? Tenant { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
