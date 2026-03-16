using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace DFile.backend.Models
{
    public class AssetAllocation
    {
        [Key]
        public string Id { get; set; } = string.Empty;

        [Required]
        public string AssetId { get; set; } = string.Empty;

        [ForeignKey("AssetId")]
        public Asset? Asset { get; set; }

        [Required]
        public string RoomId { get; set; } = string.Empty;

        [ForeignKey("RoomId")]
        public Room? Room { get; set; }

        /// <summary>Room.Id of the previous room (set during transfer, null on first allocation).</summary>
        public string? PreviousRoomId { get; set; }

        /// <summary>Active | Inactive</summary>
        [Required]
        [MaxLength(50)]
        public string Status { get; set; } = "Active";

        public string? Remarks { get; set; }

        public DateTime AllocatedAt { get; set; } = DateTime.UtcNow;

        public DateTime? DeallocatedAt { get; set; }

        public int? AllocatedBy { get; set; }

        [ForeignKey("AllocatedBy")]
        public User? AllocatedByUser { get; set; }

        public int? DeallocatedBy { get; set; }

        public int? TenantId { get; set; }

        [ForeignKey("TenantId")]
        public Tenant? Tenant { get; set; }
    }
}
