using DFile.backend.Data;
using DFile.backend.DTOs;
using DFile.backend.Models;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace DFile.backend.Services
{
    public class MaintenanceReplacementRegistrationService : IMaintenanceReplacementRegistrationService
    {
        private readonly AppDbContext _context;
        private readonly INotificationService _notificationService;

        public MaintenanceReplacementRegistrationService(AppDbContext context, INotificationService notificationService)
        {
            _context = context;
            _notificationService = notificationService;
        }

        private static bool IsMaintenanceVisibleToTenant(MaintenanceRecord r, int? tenantId, bool isSuperAdmin)
        {
            if (isSuperAdmin) return true;
            if (!tenantId.HasValue) return false;
            if (r.TenantId == tenantId) return true;
            return r.TenantId == null && r.Asset != null && r.Asset.TenantId == tenantId;
        }

        private static string? NormalizeSerial(string? value)
        {
            var normalized = value?.Trim();
            return string.IsNullOrWhiteSpace(normalized) ? null : normalized;
        }

        private async Task CloseActiveAllocationsForAssetAsync(string assetId, int? userId, CancellationToken ct)
        {
            var allocs = await _context.AssetAllocations
                .Where(a => a.AssetId == assetId && a.Status == "Active")
                .ToListAsync(ct);
            foreach (var a in allocs)
            {
                a.Status = "Inactive";
                a.DeallocatedAt = DateTime.UtcNow;
                a.DeallocatedBy = userId;
            }
        }

        public async Task<ReplacementRegistrationOutcome> RegisterReplacementAssetAsync(
            CreateAssetDto dto,
            string maintenanceRecordId,
            int? tenantId,
            int? userId,
            bool isSuperAdmin,
            CancellationToken cancellationToken = default)
        {
            var effectiveTenantId = isSuperAdmin ? null : tenantId;

            var category = await _context.AssetCategories.FindAsync(new object[] { dto.CategoryId }, cancellationToken);
            if (category == null || category.IsArchived)
                return new ReplacementRegistrationOutcome { ErrorMessage = "Invalid or archived asset category.", StatusCode = 400 };

            if (dto.PurchaseDate.HasValue && dto.PurchaseDate.Value.Date > DateTime.UtcNow.Date)
                return new ReplacementRegistrationOutcome { ErrorMessage = "Purchase date cannot be in the future.", StatusCode = 400 };

            var normalizedSerial = NormalizeSerial(dto.SerialNumber);
            if (!string.IsNullOrEmpty(normalizedSerial))
            {
                var serialExists = await _context.Assets.AnyAsync(a =>
                    a.SerialNumber != null &&
                    a.SerialNumber.ToUpper() == normalizedSerial.ToUpper() &&
                    ((effectiveTenantId == null && a.TenantId == null) || a.TenantId == effectiveTenantId),
                    cancellationToken);
                if (serialExists)
                    return new ReplacementRegistrationOutcome { ErrorMessage = "Serial number already exists for an asset in this organization.", StatusCode = 409 };
            }

            // SqlServerRetryingExecutionStrategy requires user transactions to run inside CreateExecutionStrategy.
            return await _context.Database.CreateExecutionStrategy().ExecuteAsync<ReplacementRegistrationOutcome>(async (ct) =>
            {
                await using var tx = await _context.Database.BeginTransactionAsync(ct);

                var record = await _context.MaintenanceRecords
                    .Include(r => r.Asset)
                    .FirstOrDefaultAsync(r => r.Id == maintenanceRecordId, ct);

                if (record == null || !IsMaintenanceVisibleToTenant(record, tenantId, isSuperAdmin))
                {
                    await tx.RollbackAsync(ct);
                    return new ReplacementRegistrationOutcome { ErrorMessage = "Maintenance record not found.", StatusCode = 404 };
                }

                if (!string.Equals(record.Status, "Waiting for Replacement", StringComparison.OrdinalIgnoreCase)
                    || !string.Equals(record.FinanceWorkflowStatus, "Waiting for Replacement", StringComparison.OrdinalIgnoreCase))
                {
                    await tx.RollbackAsync(ct);
                    return new ReplacementRegistrationOutcome { ErrorMessage = "Replacement can only be completed when status is Waiting for Replacement.", StatusCode = 400 };
                }

                var effectiveSalvagePct = dto.IsSalvageOverride && dto.SalvagePercentage.HasValue
                    ? dto.SalvagePercentage.Value
                    : category.SalvagePercentage;
                var computedSalvageValue = Math.Round(dto.AcquisitionCost * effectiveSalvagePct / 100m, 2);

                var reqLabel = !string.IsNullOrEmpty(record.RequestId) ? record.RequestId : record.Id;
                var replacementNote = $"Replacement asset for maintenance request {reqLabel}.";
                var mergedNotes = string.IsNullOrWhiteSpace(dto.Notes)
                    ? replacementNote
                    : $"{dto.Notes.Trim()}\n{replacementNote}";

                var newAsset = new Asset
                {
                    Id = Guid.NewGuid().ToString(),
                    AssetCode = await RecordCodeGenerator.GenerateAssetCodeAsync(_context, effectiveTenantId),
                    TagNumber = null,
                    AssetName = dto.AssetName.Trim(),
                    CategoryId = dto.CategoryId,
                    LifecycleStatus = LifecycleStatus.Registered,
                    CurrentCondition = dto.CurrentCondition,
                    HandlingTypeSnapshot = category.HandlingType.ToString(),
                    Room = dto.Room,
                    Image = dto.Image,
                    Manufacturer = dto.Manufacturer,
                    Model = dto.Model,
                    SerialNumber = normalizedSerial,
                    PurchaseDate = dto.PurchaseDate,
                    Vendor = dto.Vendor,
                    AcquisitionCost = dto.AcquisitionCost,
                    UsefulLifeYears = dto.UsefulLifeYears,
                    PurchasePrice = dto.PurchasePrice,
                    ResidualValue = dto.ResidualValue,
                    SalvagePercentage = effectiveSalvagePct,
                    SalvageValue = computedSalvageValue,
                    IsSalvageOverride = dto.IsSalvageOverride,
                    CurrentBookValue = dto.PurchasePrice,
                    MonthlyDepreciation = dto.UsefulLifeYears > 0
                        ? Math.Round(dto.PurchasePrice / (dto.UsefulLifeYears * 12), 2)
                        : 0,
                    DepreciationMonthsApplied = 0,
                    TenantId = effectiveTenantId,
                    WarrantyExpiry = dto.WarrantyExpiry,
                    Notes = mergedNotes,
                    Documents = dto.Documents,
                    IsArchived = false,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    CreatedBy = userId,
                    UpdatedBy = userId
                };

                _context.Assets.Add(newAsset);

                record.ReplacementRegisteredAssetId = newAsset.Id;
                record.Status = "Completed";
                record.FinanceWorkflowStatus = "Replacement Completed";
                record.UpdatedAt = DateTime.UtcNow;

                var original = await _context.Assets.FirstOrDefaultAsync(a => a.Id == record.AssetId, ct);
                if (original != null)
                {
                    await CloseActiveAllocationsForAssetAsync(original.Id, userId, ct);
                    original.LifecycleStatus = LifecycleStatus.Disposed;
                    original.UpdatedAt = DateTime.UtcNow;
                    original.UpdatedBy = userId;
                    var disposalNote =
                        $"[Disposed {DateTime.UtcNow:yyyy-MM-dd} UTC] Replaced by asset {newAsset.AssetCode} ({newAsset.Id}). Maintenance {reqLabel}.";
                    original.Notes = string.IsNullOrWhiteSpace(original.Notes)
                        ? disposalNote
                        : $"{original.Notes.Trim()}\n{disposalNote}";
                }

                await _notificationService.NotifyAdminReplacementAssetRegisteredAsync(record, newAsset, ct);

                try
                {
                    await _context.SaveChangesAsync(ct);
                    await tx.CommitAsync(ct);
                }
                catch (DbUpdateConcurrencyException)
                {
                    await tx.RollbackAsync(ct);
                    return new ReplacementRegistrationOutcome
                    {
                        ErrorMessage = "This maintenance request was modified by another user. Refresh and try again.",
                        StatusCode = 409,
                    };
                }
                catch (DbUpdateException ex) when (ex.InnerException is SqlException sqlEx && (sqlEx.Number == 2601 || sqlEx.Number == 2627))
                {
                    await tx.RollbackAsync(ct);
                    return new ReplacementRegistrationOutcome { ErrorMessage = "Could not save asset (duplicate key). Check serial number.", StatusCode = 409 };
                }

                return new ReplacementRegistrationOutcome { Success = true, NewAsset = newAsset, Category = category };
            }, cancellationToken);
        }
    }
}
