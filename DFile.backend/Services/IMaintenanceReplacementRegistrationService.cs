using DFile.backend.DTOs;
using DFile.backend.Models;

namespace DFile.backend.Services
{
    public sealed class ReplacementRegistrationOutcome
    {
        public bool Success { get; init; }
        public Asset? NewAsset { get; init; }
        public AssetCategory? Category { get; init; }
        public string? ErrorMessage { get; init; }
        public int StatusCode { get; init; } = 400;
    }

    /// <summary>
    /// Registers a replacement asset for a maintenance record in one transaction: create asset, complete record, dispose original.
    /// </summary>
    public interface IMaintenanceReplacementRegistrationService
    {
        Task<ReplacementRegistrationOutcome> RegisterReplacementAssetAsync(
            CreateAssetDto dto,
            string maintenanceRecordId,
            int? tenantId,
            int? userId,
            bool isSuperAdmin,
            CancellationToken cancellationToken = default);
    }
}
