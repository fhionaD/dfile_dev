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

        /// <summary>Finance users: repair/replacement awaiting approval.</summary>
        Task NotifyFinanceMaintenanceApprovalNeededAsync(MaintenanceRecord record, CancellationToken cancellationToken = default);

        /// <summary>Finance users: Maintenance logged a corrective (repair) ticket before inspection.</summary>
        Task NotifyFinanceMaintenanceCorrectiveLoggedAsync(MaintenanceRecord record, CancellationToken cancellationToken = default);

        /// <summary>Admin users: replacement asset registered via finance workflow.</summary>
        Task NotifyAdminReplacementAssetRegisteredAsync(MaintenanceRecord maintenanceRecord, Asset newAsset, CancellationToken cancellationToken = default);

        /// <summary>Maintenance users: new ticket filed by an admin.</summary>
        Task NotifyMaintenanceNewTicketFromAdminAsync(MaintenanceRecord record, CancellationToken cancellationToken = default);

        /// <summary>Admin users: new asset registered by Finance (standard registration, not replacement flow).</summary>
        Task NotifyAdminFinanceRegisteredNewAssetAsync(Asset asset, CancellationToken cancellationToken = default);

        /// <summary>Maintenance users: Finance rejected their repair or replacement request.</summary>
        Task NotifyMaintenanceFinanceRejectionAsync(MaintenanceRecord record, CancellationToken cancellationToken = default);
    }
}
