using DFile.backend.Models;

namespace DFile.backend.Core.Interfaces
{
    public interface IPurchaseOrderRepository : IRepository<PurchaseOrder>
    {
        Task<IEnumerable<PurchaseOrder>> GetByTenantAsync(int tenantId, bool showArchived = false);
    }
}
