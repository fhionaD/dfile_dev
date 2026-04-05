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
                TargetRole = "Procurement",
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
                TargetRole = "Admin",
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
                TargetRole = "Maintenance",
                TenantId = notice.RecordTenantId ?? notice.AssetTenantId,
            });
            return Task.CompletedTask;
        }

        public Task NotifyMaintenancePartsReadyAsync(MaintenanceRecord record, CancellationToken cancellationToken = default)
        {
            var label = !string.IsNullOrEmpty(record.RequestId) ? record.RequestId : record.Id;
            _context.Notifications.Add(new Notification
            {
                Message = $"Parts are ready for repair request {label}. You can proceed with the work order.",
                Type = "Info",
                Module = "Maintenance",
                EntityType = "MaintenanceRecord",
                EntityId = record.Id,
                TargetRole = "Maintenance",
                TenantId = record.TenantId,
            });
            return Task.CompletedTask;
        }
    }
}
