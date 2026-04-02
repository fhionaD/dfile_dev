using DFile.backend.Models;

namespace DFile.backend.Services
{
    /// <summary>
    /// Centralizes audit log rows (IP, user agent, role snapshot, EF Add) for consistency across controllers.
    /// </summary>
    public interface IAuditService
    {
        /// <summary>Enqueue an audit row; fills IP, user agent, and UserRole (from claims) when omitted.</summary>
        void Add(HttpContext httpContext, AuditLog entry);

        /// <summary>Creates an audit row with the standard tenant activity shape.</summary>
        void AddEntry(
            HttpContext httpContext,
            int? tenantId,
            int? userId,
            string? userRole,
            string module,
            string action,
            string entityType,
            string? entityId,
            string? description);
    }
}
