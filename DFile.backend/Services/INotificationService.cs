using DFile.backend.DTOs;
using DFile.backend.Models;

namespace DFile.backend.Services
{
    public interface INotificationService
    {
        Task NotifyPurchaseOrderApprovedAsync(PurchaseOrder order, CancellationToken cancellationToken = default);
        Task NotifyReplacementNeededAsync(Asset asset, int? tenantId, CancellationToken cancellationToken = default);
        Task NotifyMaintenanceDueAsync(MaintenanceDueNoticeDto notice, CancellationToken cancellationToken = default);

        Task NotifyMaintenancePartsReadyAsync(MaintenanceRecord record, CancellationToken cancellationToken = default);
    }
}
