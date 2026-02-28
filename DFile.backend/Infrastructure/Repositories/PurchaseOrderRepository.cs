using DFile.backend.Core.Interfaces;
using DFile.backend.Data;
using DFile.backend.Models;
using Microsoft.EntityFrameworkCore;

namespace DFile.backend.Infrastructure.Repositories
{
    public class PurchaseOrderRepository : Repository<PurchaseOrder>, IPurchaseOrderRepository
    {
        public PurchaseOrderRepository(AppDbContext context) : base(context)
        {
        }

        public async Task<IEnumerable<PurchaseOrder>> GetByTenantAsync(int tenantId, bool showArchived = false)
        {
            return await _dbSet
                .AsNoTracking()
                .Where(o => o.TenantId == tenantId && o.Archived == showArchived)
                .OrderByDescending(o => o.CreatedAt)
                .ToListAsync();
        }
    }
}
