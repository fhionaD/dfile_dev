using DFile.backend.Core.Interfaces;
using DFile.backend.Infrastructure;
using DFile.backend.Models;

namespace DFile.backend.Core.Application.Services
{
    public interface IProcurementService
    {
        Task<IEnumerable<PurchaseOrder>> GetPurchaseOrdersAsync(int? tenantId, bool showArchived);
        Task<PurchaseOrder?> GetPurchaseOrderByIdAsync(string id);
        Task<PurchaseOrder> CreatePurchaseOrderAsync(PurchaseOrder order, int? tenantId);
        Task UpdatePurchaseOrderAsync(PurchaseOrder order);
        Task ArchiveOrderAsync(string id);
        Task RestoreOrderAsync(string id);
    }

    public class ProcurementService : IProcurementService
    {
        private readonly IUnitOfWork _unitOfWork;

        public ProcurementService(IUnitOfWork unitOfWork)
        {
            _unitOfWork = unitOfWork;
        }

        public async Task<IEnumerable<PurchaseOrder>> GetPurchaseOrdersAsync(int? tenantId, bool showArchived)
        {
            if (tenantId.HasValue)
            {
                return await _unitOfWork.PurchaseOrders.GetByTenantAsync(tenantId.Value, showArchived);
            }
            return await _unitOfWork.PurchaseOrders.GetAllAsync(showArchived);
        }

        public async Task<PurchaseOrder?> GetPurchaseOrderByIdAsync(string id)
        {
            return await _unitOfWork.PurchaseOrders.GetByIdAsync(id);
        }

        public async Task<PurchaseOrder> CreatePurchaseOrderAsync(PurchaseOrder order, int? tenantId)
        {
            if (tenantId.HasValue)
            {
                order.TenantId = tenantId.Value;
            }

            if (string.IsNullOrEmpty(order.Id))
                order.Id = $"PO-{DateTime.UtcNow.Ticks.ToString().Substring(10)}";

            order.CreatedAt = DateTime.UtcNow;
            await _unitOfWork.PurchaseOrders.AddAsync(order);
            await _unitOfWork.CompleteAsync();
            return order;
        }

        public async Task UpdatePurchaseOrderAsync(PurchaseOrder order)
        {
            _unitOfWork.PurchaseOrders.Update(order);
            await _unitOfWork.CompleteAsync();
        }

        public async Task ArchiveOrderAsync(string id)
        {
            var order = await _unitOfWork.PurchaseOrders.GetByIdAsync(id);
            if (order != null)
            {
                order.Archived = true;
                _unitOfWork.PurchaseOrders.Update(order);
                await _unitOfWork.CompleteAsync();
            }
        }

        public async Task RestoreOrderAsync(string id)
        {
            var order = await _unitOfWork.PurchaseOrders.GetByIdAsync(id);
            if (order != null)
            {
                order.Archived = false;
                _unitOfWork.PurchaseOrders.Update(order);
                await _unitOfWork.CompleteAsync();
            }
        }
    }
}
