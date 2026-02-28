using DFile.backend.Core.Interfaces;
using DFile.backend.Infrastructure;
using DFile.backend.Models;

namespace DFile.backend.Core.Application.Services
{
    public interface IAssetService
    {
        Task<IEnumerable<Asset>> GetAssetsAsync(int? tenantId, bool? showArchived);
        Task<Asset?> GetAssetByIdAsync(string id);
        Task<Asset> CreateAssetAsync(Asset asset);
        Task UpdateAssetAsync(Asset asset);
        Task ArchiveAssetAsync(string id);
        Task RestoreAssetAsync(string id);
        Task DeleteAssetAsync(string id);
    }

    public class AssetService : IAssetService
    {
        private readonly IUnitOfWork _unitOfWork;

        public AssetService(IUnitOfWork unitOfWork)
        {
            _unitOfWork = unitOfWork;
        }

        public async Task<IEnumerable<Asset>> GetAssetsAsync(int? tenantId, bool? showArchived)
        {
            if (tenantId.HasValue)
            {
                return await _unitOfWork.Assets.GetByTenantAsync(tenantId.Value, showArchived);
            }
            return await _unitOfWork.Assets.GetAssetsAsync(showArchived);
        }

        public async Task<Asset?> GetAssetByIdAsync(string id)
        {
            return await _unitOfWork.Assets.GetByIdAsync(id);
        }

        public async Task<Asset> CreateAssetAsync(Asset asset)
        {
            await _unitOfWork.Assets.AddAsync(asset);
            await _unitOfWork.CompleteAsync();
            return asset;
        }

        public async Task UpdateAssetAsync(Asset asset)
        {
            _unitOfWork.Assets.Update(asset);
            await _unitOfWork.CompleteAsync();
        }

        public async Task ArchiveAssetAsync(string id)
        {
            var asset = await _unitOfWork.Assets.GetByIdAsync(id);
            if (asset != null)
            {
                asset.Status = "Archived";
                _unitOfWork.Assets.Update(asset);
                await _unitOfWork.CompleteAsync();
            }
        }

        public async Task RestoreAssetAsync(string id)
        {
            var asset = await _unitOfWork.Assets.GetByIdAsync(id);
            if (asset != null)
            {
                asset.Status = "Active";
                _unitOfWork.Assets.Update(asset);
                await _unitOfWork.CompleteAsync();
            }
        }

        public async Task DeleteAssetAsync(string id)
        {
            var asset = await _unitOfWork.Assets.GetByIdAsync(id);
            if (asset != null)
            {
                _unitOfWork.Assets.Remove(asset);
                await _unitOfWork.CompleteAsync();
            }
        }
    }
}
