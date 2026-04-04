namespace DFile.backend.DTOs
{
    /// <summary>
    /// Minimal fields for maintenance-due notifications — avoids loading full MaintenanceRecord + Asset graphs.
    /// </summary>
    public sealed class MaintenanceDueNoticeDto
    {
        public string RecordId { get; init; } = string.Empty;
        public string Description { get; init; } = string.Empty;
        public string AssetId { get; init; } = string.Empty;
        public string? AssetName { get; init; }
        public string? AssetCode { get; init; }
        public int? RecordTenantId { get; init; }
        public int? AssetTenantId { get; init; }
    }
}
