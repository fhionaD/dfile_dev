using DFile.backend.Authorization;
using DFile.backend.Data;
using DFile.backend.Models;
using System.Security.Claims;

namespace DFile.backend.Services
{
    public class AuditService : IAuditService
    {
        private readonly AppDbContext _context;

        public AuditService(AppDbContext context)
        {
            _context = context;
        }

        public void Add(HttpContext httpContext, AuditLog entry)
        {
            entry.IpAddress ??= httpContext.Connection.RemoteIpAddress?.ToString();
            entry.UserAgent ??= httpContext.Request.Headers.UserAgent.ToString();
            entry.UserRole ??= httpContext.User.GetJwtRole();
            _context.AuditLogs.Add(entry);
        }

        public void AddEntry(
            HttpContext httpContext,
            int? tenantId,
            int? userId,
            string? userRole,
            string module,
            string action,
            string entityType,
            string? entityId,
            string? description)
        {
            Add(httpContext, new AuditLog
            {
                TenantId = tenantId,
                UserId = userId,
                UserRole = userRole,
                Module = module,
                Action = action,
                EntityType = entityType,
                EntityId = entityId,
                Description = description,
                CreatedAt = DateTime.UtcNow,
            });
        }
    }
}
