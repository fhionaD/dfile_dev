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

        public void Add(HttpContext httpContext, AuditLog entry)
        {
            entry.IpAddress ??= httpContext.Connection.RemoteIpAddress?.ToString();
            entry.UserAgent ??= httpContext.Request.Headers.UserAgent.ToString();
            _context.AuditLogs.Add(entry);
        }
    }
}
