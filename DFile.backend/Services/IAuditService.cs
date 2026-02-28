using DFile.backend.Models;

namespace DFile.backend.Services
{
    public interface IAuditService
    {
        Task LogActionAsync(string actorId, string actorName, string action, string details, int? tenantId);
    }
}
