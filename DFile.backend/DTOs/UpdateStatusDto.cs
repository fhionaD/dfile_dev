using System.ComponentModel.DataAnnotations;

namespace DFile.backend.DTOs
{
    public class UpdateStatusDto
    {
        [Required]
        public string Status { get; set; } = string.Empty;
    }
}
