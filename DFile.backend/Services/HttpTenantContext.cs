using System.Security.Claims;
using Microsoft.AspNetCore.Http;

namespace DFile.backend.Services
{
    public class HttpTenantContext : ITenantContext
    {
        private readonly IHttpContextAccessor _httpContextAccessor;

        public HttpTenantContext(IHttpContextAccessor httpContextAccessor)
        {
            _httpContextAccessor = httpContextAccessor;
        }

        private ClaimsPrincipal? User => _httpContextAccessor.HttpContext?.User;

        public int? TenantId
        {
            get
            {
                var v = User?.FindFirst("TenantId")?.Value;
                return string.IsNullOrEmpty(v) ? null : int.Parse(v);
            }
        }

        public int? UserId
        {
            get
            {
                var v = User?.FindFirst("UserId")?.Value
                    ?? User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                return string.IsNullOrEmpty(v) ? null : int.Parse(v);
            }
        }

        public bool IsSuperAdmin =>
            User?.IsInRole("Super Admin") == true;

        public string? Role => User?.FindFirst(ClaimTypes.Role)?.Value
            ?? User?.FindFirst("Role")?.Value;
    }
}
