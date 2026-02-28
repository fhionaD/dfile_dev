using DFile.backend.Core.Interfaces;
using DFile.backend.Data;
using DFile.backend.Infrastructure.Repositories;

namespace DFile.backend.Infrastructure
{
    public interface IUnitOfWork : IDisposable
    {
        IPurchaseOrderRepository PurchaseOrders { get; }
        IAssetRepository Assets { get; }
        Task<int> CompleteAsync();
    }

    public class UnitOfWork : IUnitOfWork
    {
        private readonly AppDbContext _context;
        private IPurchaseOrderRepository? _purchaseOrders;
        private IAssetRepository? _assets;

        public UnitOfWork(AppDbContext context)
        {
            _context = context;
        }

        public IPurchaseOrderRepository PurchaseOrders => _purchaseOrders ??= new PurchaseOrderRepository(_context);
        public IAssetRepository Assets => _assets ??= new AssetRepository(_context);

        public async Task<int> CompleteAsync()
        {
            return await _context.SaveChangesAsync();
        }

        public void Dispose()
        {
            _context.Dispose();
        }
    }
}
