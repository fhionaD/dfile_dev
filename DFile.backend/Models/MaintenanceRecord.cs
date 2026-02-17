using System;
using System.ComponentModel.DataAnnotations;

namespace DFile.backend.Models
{
    public class MaintenanceRecord
    {
        [Key]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        public string AssetId { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string Status { get; set; } = "Pending"; // Pending, In Progress, Completed, Scheduled
        public string Priority { get; set; } = "Medium"; // Low, Medium, High
        public string Type { get; set; } = "Corrective"; // Preventive, Corrective, Upgrade, Inspection
        public string? Frequency { get; set; } // One-time, Daily, Weekly, Monthly, Yearly
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public decimal? Cost { get; set; }
        public DateTime DateReported { get; set; } = DateTime.UtcNow;
        public string? Attachments { get; set; } // Comma separated string for simplicity in SQL

        public bool Archived { get; set; } = false;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
