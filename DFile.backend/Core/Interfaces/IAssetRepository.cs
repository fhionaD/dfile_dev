using DFile.backend.Models;

namespace DFile.backend.Core.Interfaces
{
    public interface IAssetRepository : IRepository<Asset>
    {
        Task<IEnumerable<Asset>> GetAssetsAsync(bool? showArchived);
        Task<IEnumerable<Asset>> GetByTenantAsync(int tenantId, bool? showArchived);
    }
}
