using System.ComponentModel.DataAnnotations;

namespace DFile.backend.Models
{
    public class TaskItem
    {
        public string Id { get; set; } = Guid.NewGuid().ToString(); // Using String as requested in frontend
        [Required]
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string Priority { get; set; } = "Medium";
        public string Status { get; set; } = "Pending";
        public string? AssignedTo { get; set; } // Employee ID
        public DateTime? DueDate { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
