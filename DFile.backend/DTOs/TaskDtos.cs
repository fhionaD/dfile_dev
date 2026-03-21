using System.ComponentModel.DataAnnotations;

namespace DFile.backend.DTOs
{
    public class CreateTaskDto
    {
        [Required]
        public string Title { get; set; } = string.Empty;

        public string Description { get; set; } = string.Empty;
        public string Priority { get; set; } = "Medium";
        public string Status { get; set; } = "Pending";
        public string? AssignedTo { get; set; }
        public DateTime? DueDate { get; set; }
    }

    public class UpdateTaskDto
    {
        [Required]
        public string Title { get; set; } = string.Empty;

        public string Description { get; set; } = string.Empty;
        public string Priority { get; set; } = "Medium";
        public string Status { get; set; } = "Pending";
        public string? AssignedTo { get; set; }
        public DateTime? DueDate { get; set; }
        public bool IsArchived { get; set; }
    }
}
