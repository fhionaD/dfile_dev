using DFile.backend.Constants;
using DFile.backend.Data;
using DFile.backend.DTOs;
using DFile.backend.Models;
using Microsoft.EntityFrameworkCore;

namespace DFile.backend.Services
{
    public class NotificationService : INotificationService
    {
        private readonly AppDbContext _context;
        private readonly IEmailService _email;
        private readonly IEmailEncryptionService _emailEncryption;

        public NotificationService(AppDbContext context, IEmailService email, IEmailEncryptionService emailEncryption)
        {
            _context = context;
            _email = email;
            _emailEncryption = emailEncryption;
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
                Route = $"/finance/purchase-orders/{order.Id}",
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
                Module = "Replacements",
                EntityType = "Asset",
                EntityId = asset.Id,
                Route = $"/tenant/inventory",
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
                Route = $"/maintenance/work-orders/{notice.RecordId}",
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
                Route = $"/maintenance/work-orders/{record.Id}",
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
                Route = $"/finance/maintenance-requests",
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
                Route = $"/finance/maintenance-requests",
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
                Route = $"/tenant/inventory",
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
                Route = $"/maintenance/work-orders/{record.Id}",
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
                Route = $"/tenant/inventory",
                TargetRole = UserRoleConstants.Admin,
                TenantId = asset.TenantId,
            });
            return Task.CompletedTask;
        }

        public Task NotifyMaintenanceFinanceRejectionAsync(MaintenanceRecord record, CancellationToken cancellationToken = default)
        {
            var label = !string.IsNullOrEmpty(record.RequestId) ? record.RequestId : record.Id;
            var kind = string.IsNullOrWhiteSpace(record.FinanceRequestType) ? "request" : record.FinanceRequestType.ToLowerInvariant();
            var tenantId = record.TenantId ?? record.Asset?.TenantId;
            _context.Notifications.Add(new Notification
            {
                Message = $"Finance rejected your {kind} for {record.Asset?.AssetName ?? record.AssetId} ({label}). Please re-inspect and resubmit.",
                Type = "Warning",
                Module = "Maintenance",
                EntityType = "MaintenanceRecord",
                EntityId = record.Id,
                Route = $"/maintenance/work-orders/{record.Id}",
                TargetRole = UserRoleConstants.Maintenance,
                TenantId = tenantId,
            });
            return Task.CompletedTask;
        }

        // ── Subscription lifecycle ────────────────────────────────────────

        public async Task NotifySubscriptionActivatedAsync(int tenantId, string planName, string billingCycle, DateTime endDate, CancellationToken cancellationToken = default)
        {
            var msg = $"Your {planName} ({billingCycle}) subscription is now active. It expires on {endDate:MMMM d, yyyy}.";
            _context.Notifications.Add(new Notification
            {
                Message = msg,
                Type = "Success",
                Module = "Billing",
                EntityType = "Subscription",
                Route = "/tenant/billing",
                TargetRole = UserRoleConstants.Admin,
                TenantId = tenantId,
            });

            var email = await GetTenantAdminEmailAsync(tenantId, cancellationToken);
            if (!string.IsNullOrEmpty(email))
            {
                await _email.SendEmailAsync(email, $"DFile — {planName} subscription activated",
                    $"<p>{msg}</p><p>Log in to your DFile dashboard to manage your subscription.</p>");
            }
        }

        public async Task NotifySubscriptionExpiringAsync(int tenantId, string planName, DateTime endDate, int daysLeft, CancellationToken cancellationToken = default)
        {
            var dayLabel = daysLeft == 1 ? "1 day" : $"{daysLeft} days";
            var msg = $"Your {planName} subscription expires in {dayLabel} (on {endDate:MMMM d, yyyy}). Renew now to avoid interruption.";
            _context.Notifications.Add(new Notification
            {
                Message = msg,
                Type = "Warning",
                Module = "Billing",
                EntityType = "Subscription",
                Route = "/tenant/billing",
                TargetRole = UserRoleConstants.Admin,
                TenantId = tenantId,
            });

            var email = await GetTenantAdminEmailAsync(tenantId, cancellationToken);
            if (!string.IsNullOrEmpty(email))
            {
                await _email.SendEmailAsync(email, $"DFile — {planName} subscription expiring in {dayLabel}",
                    $"<p>{msg}</p><p>Visit your <strong>Billing</strong> page to renew your subscription.</p>");
            }
        }

        public async Task NotifySubscriptionExpiredAsync(int tenantId, string planName, CancellationToken cancellationToken = default)
        {
            var msg = $"Your {planName} subscription has expired. Renew to restore full access.";
            _context.Notifications.Add(new Notification
            {
                Message = msg,
                Type = "Error",
                Module = "Billing",
                EntityType = "Subscription",
                Route = "/tenant/billing",
                TargetRole = UserRoleConstants.Admin,
                TenantId = tenantId,
            });

            var email = await GetTenantAdminEmailAsync(tenantId, cancellationToken);
            if (!string.IsNullOrEmpty(email))
            {
                await _email.SendEmailAsync(email, $"DFile — {planName} subscription expired",
                    $"<p>{msg}</p><p>Visit your <strong>Billing</strong> page to renew your subscription.</p>");
            }
        }

        public async Task NotifyPaymentFailedAsync(int tenantId, string planName, CancellationToken cancellationToken = default)
        {
            var msg = $"Payment for your {planName} subscription failed. Please try again or contact support.";
            _context.Notifications.Add(new Notification
            {
                Message = msg,
                Type = "Error",
                Module = "Billing",
                EntityType = "Payment",
                Route = "/tenant/billing",
                TargetRole = UserRoleConstants.Admin,
                TenantId = tenantId,
            });

            var email = await GetTenantAdminEmailAsync(tenantId, cancellationToken);
            if (!string.IsNullOrEmpty(email))
            {
                await _email.SendEmailAsync(email, $"DFile — {planName} payment failed",
                    $"<p>{msg}</p><p>Visit your <strong>Billing</strong> page to retry your payment.</p>");
            }
        }

        private async Task<string?> GetTenantAdminEmailAsync(int tenantId, CancellationToken cancellationToken)
        {
            var encrypted = await _context.Users
                .Where(u => u.TenantId == tenantId && u.Role == "Admin" && u.Status == "Active")
                .Select(u => u.Email)
                .FirstOrDefaultAsync(cancellationToken);
            return encrypted == null ? null : _emailEncryption.Decrypt(encrypted);
        }
    }
}
