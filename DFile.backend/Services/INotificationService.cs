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

        // ── Subscription lifecycle ────────────────────────────────────────

        /// <summary>Tenant Admin: subscription successfully activated after payment.</summary>
        Task NotifySubscriptionActivatedAsync(int tenantId, string planName, string billingCycle, DateTime endDate, CancellationToken cancellationToken = default);

        /// <summary>Tenant Admin: subscription is expiring soon. Called for 7-day, 3-day, and 1-day thresholds.</summary>
        Task NotifySubscriptionExpiringAsync(int tenantId, string planName, DateTime endDate, int daysLeft, CancellationToken cancellationToken = default);

        /// <summary>Tenant Admin: subscription has expired.</summary>
        Task NotifySubscriptionExpiredAsync(int tenantId, string planName, CancellationToken cancellationToken = default);

        /// <summary>Tenant Admin: payment for subscription failed.</summary>
        Task NotifyPaymentFailedAsync(int tenantId, string planName, CancellationToken cancellationToken = default);
    }
}
