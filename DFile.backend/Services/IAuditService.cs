using DFile.backend.Models;

namespace DFile.backend.Services
{
    /// <summary>
    /// Centralizes audit log rows (IP, user agent, EF Add) for consistency across controllers.
    /// </summary>
    public interface IAuditService
    {
        void Add(HttpContext httpContext, AuditLog entry);
    }
}
