using System.ComponentModel.DataAnnotations;

namespace DFile.backend.Models
{
    public class AuditLog
    {
        public int Id { get; set; }
        
        [Required]
        public DateTime Timestamp { get; set; }
        
        [Required]
        public string ActorId { get; set; } = string.Empty;
        
        [Required]
        public string ActorName { get; set; } = string.Empty;
        
        [Required]
        public string Action { get; set; } = string.Empty; // e.g., "AccountCreated", "PasswordReset", "PasswordChanged"
        
        [Required]
        public string Details { get; set; } = string.Empty;
        
        public int? TenantId { get; set; }
    }
}
