using DFile.backend.Core.Interfaces;
using DFile.backend.Data;
using DFile.backend.Models;
using Microsoft.EntityFrameworkCore;

namespace DFile.backend.Infrastructure.Repositories
{
    public class AssetRepository : Repository<Asset>, IAssetRepository
    {
        public AssetRepository(AppDbContext context) : base(context)
        {
        }

        public async Task<IEnumerable<Asset>> GetAssetsAsync(bool? showArchived)
        {
            var query = _dbSet.AsNoTracking();
            
            if (showArchived == true)
                query = query.Where(a => a.Status == "Archived");
            else if (showArchived == false)
                query = query.Where(a => a.Status != "Archived");

            return await query.ToListAsync();
        }

        public async Task<IEnumerable<Asset>> GetByTenantAsync(int tenantId, bool? showArchived)
        {
            var query = _dbSet.AsNoTracking().Where(a => a.TenantId == tenantId);

            if (showArchived == true)
                query = query.Where(a => a.Status == "Archived");
            else if (showArchived == false)
                query = query.Where(a => a.Status != "Archived");

            return await query.ToListAsync();
        }
    }
}
