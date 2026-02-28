using DFile.backend.Data;
using DFile.backend.Models;

namespace DFile.backend.Services
{
    public class AuditService : IAuditService
    {
        private readonly AppDbContext _context;

        public AuditService(AppDbContext context)
        {
            _context = context;
        }

        public async Task LogActionAsync(string actorId, string actorName, string action, string details, int? tenantId)
        {
            var log = new AuditLog
            {
                Timestamp = DateTime.UtcNow,
                ActorId = actorId,
                ActorName = actorName,
                Action = action,
                Details = details,
                TenantId = tenantId
            };

            _context.AuditLogs.Add(log);
            await _context.SaveChangesAsync();
        }
    }
}
