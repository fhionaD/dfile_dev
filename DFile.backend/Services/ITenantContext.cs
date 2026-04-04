namespace DFile.backend.Services
{
    /// <summary>
    /// Request-scoped tenant and principal context for SaaS isolation in services and future query filters.
    /// Populated from the current JWT; Super Admin has no tenant.
    /// </summary>
    public interface ITenantContext
    {
        int? TenantId { get; }
        int? UserId { get; }
        bool IsSuperAdmin { get; }
        string? Role { get; }
    }
}
