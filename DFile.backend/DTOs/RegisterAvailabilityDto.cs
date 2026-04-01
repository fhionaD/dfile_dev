namespace DFile.backend.DTOs
{
    /// <summary>Response for GET /api/Tenants/register/availability.</summary>
    public record RegisterAvailabilityDto(bool Available, string? Message = null);
}
