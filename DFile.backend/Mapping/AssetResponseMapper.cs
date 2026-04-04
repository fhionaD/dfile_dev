using DFile.backend.DTOs;
using DFile.backend.Models;

namespace DFile.backend.Mapping
{
    public static class AssetResponseMapper
    {
        private static readonly Dictionary<LifecycleStatus, string> StatusLabels = new()
        {
            { LifecycleStatus.Registered, "Registered" },
            { LifecycleStatus.Allocated, "Allocated" },
            { LifecycleStatus.InUse, "In Use" },
            { LifecycleStatus.UnderMaintenance, "Under Maintenance" },
            { LifecycleStatus.UnderReview, "Under Review" },
            { LifecycleStatus.ForReplacement, "For Replacement" },
            { LifecycleStatus.Disposed, "Disposed" },
            { LifecycleStatus.Archived, "Archived" }
        };

        private static readonly Dictionary<AssetCondition, string> ConditionLabels = new()
        {
            { AssetCondition.Good, "Good" },
            { AssetCondition.Fair, "Fair" },
            { AssetCondition.Poor, "Poor" },
            { AssetCondition.Critical, "Critical" },
            { AssetCondition.Unknown, "Unknown" }
        };

        public static AssetResponseDto ToDto(
            Asset a,
            AssetCategory? cat,
            Dictionary<int, string> userNames,
            Room? activeRoom,
            string? purchaseOrderId = null)
        {
            var poId = purchaseOrderId ?? a.PurchaseOrderId;
            return new AssetResponseDto
            {
                Id = a.Id,
                AssetCode = a.AssetCode,
                TagNumber = a.TagNumber,
                AssetName = a.AssetName,
                CategoryId = a.CategoryId,
                CategoryName = cat?.CategoryName,
                HandlingType = cat?.HandlingType,
                CategoryDisplayName = cat?.DisplayLabel,
                LifecycleStatus = a.LifecycleStatus,
                Status = StatusLabels.GetValueOrDefault(a.LifecycleStatus, "Unknown"),
                CurrentCondition = a.CurrentCondition,
                ConditionLabel = ConditionLabels.GetValueOrDefault(a.CurrentCondition, "Unknown"),
                Room = null,
                RoomId = activeRoom?.Id,
                RoomCode = activeRoom?.RoomCode,
                RoomName = activeRoom?.Name,
                AllocationState = activeRoom != null ? "Allocated" : "Unallocated",
                Image = a.Image,
                Manufacturer = a.Manufacturer,
                Model = a.Model,
                SerialNumber = a.SerialNumber,
                PurchaseDate = a.PurchaseDate,
                Vendor = a.Vendor,
                AcquisitionCost = a.AcquisitionCost,
                UsefulLifeYears = a.UsefulLifeYears,
                PurchasePrice = a.PurchasePrice,
                ResidualValue = a.ResidualValue,
                SalvagePercentage = a.SalvagePercentage,
                SalvageValue = a.SalvageValue,
                IsSalvageOverride = a.IsSalvageOverride,
                CurrentBookValue = a.CurrentBookValue,
                MonthlyDepreciation = a.MonthlyDepreciation,
                TenantId = a.TenantId,
                WarrantyExpiry = a.WarrantyExpiry,
                Notes = a.Notes,
                Documents = a.Documents,
                IsArchived = a.IsArchived,
                CreatedAt = a.CreatedAt,
                UpdatedAt = a.UpdatedAt,
                CreatedByName = a.CreatedBy.HasValue && userNames.TryGetValue(a.CreatedBy.Value, out var cn) ? cn : null,
                UpdatedByName = a.UpdatedBy.HasValue && userNames.TryGetValue(a.UpdatedBy.Value, out var un) ? un : null,
                RowVersion = a.RowVersion,
                PurchaseOrderId = poId
            };
        }
    }
}
