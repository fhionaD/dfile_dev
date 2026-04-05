using System.Security.Claims;

namespace DFile.backend.Authorization
{
    /// <summary>
    /// JWT inbound claim mapping can surface role as <see cref="ClaimTypes.Role"/> or short type "role"
    /// depending on handler/version; always resolve both for consistent RBAC and notifications.
    /// </summary>
    public static class ClaimsPrincipalExtensions
    {
        public static string? GetJwtRole(this ClaimsPrincipal user) =>
            user.FindFirst(ClaimTypes.Role)?.Value
            ?? user.FindFirst("role")?.Value;
    }
}
