using DFile.backend.Constants;
using DFile.backend.Data;
using DFile.backend.DTOs;
using DFile.backend.Models;

namespace DFile.backend.Services
{
    public class NotificationService : INotificationService
    {
        private readonly AppDbContext _context;

        public NotificationService(AppDbContext context)
        {
            _context = context;
        }

        public Task NotifyPurchaseOrderApprovedAsync(PurchaseOrder order, CancellationToken cancellationToken = default)
        {
            _context.Notifications.Add(new Notification
            {
                Message = $"Purchase order {order.OrderCode} ({order.AssetName}) has been approved.",
                Type = "Info",
                Module = "PurchaseOrders",
                EntityType = "PurchaseOrder",
                EntityId = order.Id,
                TargetRole = UserRoleConstants.Procurement,
                TenantId = order.TenantId,
            });
            return Task.CompletedTask;
        }

        public Task NotifyReplacementNeededAsync(Asset asset, int? tenantId, CancellationToken cancellationToken = default)
        {
            _context.Notifications.Add(new Notification
            {
                Message = $"Asset '{asset.AssetName}' ({asset.AssetCode}) has been marked as beyond repair and needs replacement.",
                Type = "Warning",
                Module = "Maintenance",
                EntityType = "Asset",
                EntityId = asset.Id,
                TargetRole = UserRoleConstants.Admin,
                TenantId = tenantId,
            });
            return Task.CompletedTask;
        }

        public Task NotifyMaintenanceDueAsync(MaintenanceDueNoticeDto notice, CancellationToken cancellationToken = default)
        {
            var assetLabel = !string.IsNullOrEmpty(notice.AssetName)
                ? $"{notice.AssetName}{(string.IsNullOrEmpty(notice.AssetCode) ? "" : $" ({notice.AssetCode})")}"
                : notice.AssetId;
            _context.Notifications.Add(new Notification
            {
                Message = $"Maintenance due today: {notice.Description} — {assetLabel}.",
                Type = "Info",
                Module = "Maintenance",
                EntityType = "MaintenanceRecord",
                EntityId = notice.RecordId,
                TargetRole = UserRoleConstants.Maintenance,
                TenantId = notice.RecordTenantId ?? notice.AssetTenantId,
            });
            return Task.CompletedTask;
        }

        public Task NotifyMaintenancePartsReadyAsync(MaintenanceRecord record, CancellationToken cancellationToken = default)
        {
            var label = !string.IsNullOrEmpty(record.RequestId) ? record.RequestId : record.Id;
            var tenantId = record.TenantId ?? record.Asset?.TenantId;
            _context.Notifications.Add(new Notification
            {
                Message = $"Parts are ready for repair request {label}. You can proceed with the work order.",
                Type = "Info",
                Module = "Maintenance",
                EntityType = "MaintenanceRecord",
                EntityId = record.Id,
                TargetRole = UserRoleConstants.Maintenance,
                TenantId = tenantId,
            });
            return Task.CompletedTask;
        }

        public Task NotifyFinanceMaintenanceApprovalNeededAsync(MaintenanceRecord record, CancellationToken cancellationToken = default)
        {
            var label = !string.IsNullOrEmpty(record.RequestId) ? record.RequestId : record.Id;
            var kind = string.IsNullOrWhiteSpace(record.FinanceRequestType) ? "request" : record.FinanceRequestType;
            var tenantId = record.TenantId ?? record.Asset?.TenantId;
            _context.Notifications.Add(new Notification
            {
                Message = $"Maintenance request {label} requires finance approval ({kind}).",
                Type = "Info",
                Module = "Finance",
                EntityType = "MaintenanceRecord",
                EntityId = record.Id,
                TargetRole = UserRoleConstants.Finance,
                TenantId = tenantId,
            });
            return Task.CompletedTask;
        }

        public Task NotifyFinanceMaintenanceCorrectiveLoggedAsync(MaintenanceRecord record, CancellationToken cancellationToken = default)
        {
            var label = !string.IsNullOrEmpty(record.RequestId) ? record.RequestId : record.Id;
            var tenantId = record.TenantId;
            _context.Notifications.Add(new Notification
            {
                Message = $"Maintenance submitted a corrective repair request ({label}).",
                Type = "Info",
                Module = "Finance",
                EntityType = "MaintenanceRecord",
                EntityId = record.Id,
                TargetRole = UserRoleConstants.Finance,
                TenantId = tenantId,
            });
            return Task.CompletedTask;
        }

        public Task NotifyAdminReplacementAssetRegisteredAsync(MaintenanceRecord maintenanceRecord, Asset newAsset, CancellationToken cancellationToken = default)
        {
            var req = !string.IsNullOrEmpty(maintenanceRecord.RequestId) ? maintenanceRecord.RequestId : maintenanceRecord.Id;
            _context.Notifications.Add(new Notification
            {
                Message = $"Finance registered replacement asset {newAsset.AssetCode} ({newAsset.AssetName}) for maintenance {req}. Review allocation and tagging.",
                Type = "Success",
                Module = "Assets",
                EntityType = "Asset",
                EntityId = newAsset.Id,
                TargetRole = UserRoleConstants.Admin,
                TenantId = maintenanceRecord.TenantId ?? newAsset.TenantId,
            });
            return Task.CompletedTask;
        }

        public Task NotifyMaintenanceNewTicketFromAdminAsync(MaintenanceRecord record, CancellationToken cancellationToken = default)
        {
            var label = !string.IsNullOrEmpty(record.RequestId) ? record.RequestId : record.Id;
            var tenantId = record.TenantId ?? record.Asset?.TenantId;
            _context.Notifications.Add(new Notification
            {
                Message = $"New maintenance ticket {label} from Admin: {record.Description}",
                Type = "Info",
                Module = "Maintenance",
                EntityType = "MaintenanceRecord",
                EntityId = record.Id,
                TargetRole = UserRoleConstants.Maintenance,
                TenantId = tenantId,
            });
            return Task.CompletedTask;
        }

        public Task NotifyAdminFinanceRegisteredNewAssetAsync(Asset asset, CancellationToken cancellationToken = default)
        {
            _context.Notifications.Add(new Notification
            {
                Message = $"Finance registered new asset {asset.AssetCode} ({asset.AssetName}). Review tagging and allocation.",
                Type = "Success",
                Module = "Assets",
                EntityType = "Asset",
                EntityId = asset.Id,
                TargetRole = UserRoleConstants.Admin,
                TenantId = asset.TenantId,
            });
            return Task.CompletedTask;
        }

        public Task NotifyMaintenanceFinanceRejectionAsync(MaintenanceRecord record, CancellationToken cancellationToken = default)
        {
            var label = !string.IsNullOrEmpty(record.RequestId) ? record.RequestId : record.Id;
            var kind = string.IsNullOrWhiteSpace(record.FinanceRequestType) ? "request" : record.FinanceRequestType.ToLower();
            var tenantId = record.TenantId ?? record.Asset?.TenantId;
            _context.Notifications.Add(new Notification
            {
                Message = $"Finance rejected your {kind} for {record.Asset?.AssetName ?? record.AssetId} ({label}). Please re-inspect and resubmit.",
                Type = "Warning",
                Module = "Maintenance",
                EntityType = "MaintenanceRecord",
                EntityId = record.Id,
                TargetRole = UserRoleConstants.Maintenance,
                TenantId = tenantId,
            });
            return Task.CompletedTask;
        }
    }
}
