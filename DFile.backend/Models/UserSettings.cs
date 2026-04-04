using System.ComponentModel.DataAnnotations.Schema;

namespace DFile.backend.Models
{
    public class UserSettings
    {
        public int Id { get; set; }

        public int UserId { get; set; }

        [ForeignKey("UserId")]
        public User? User { get; set; }

        // Maintenance module settings
        public bool EnableAnimations { get; set; } = true;
        public bool EnableAutoCost { get; set; } = true;
        public bool EnableGlint { get; set; } = true;
        public bool EnableGlassmorphism { get; set; } = false;
        public bool EnableMinimalUI { get; set; } = false;
        public bool EnableDataCaching { get; set; } = false;
        public bool EnableBatchOperations { get; set; } = false;

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
