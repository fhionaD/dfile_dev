using DFile.backend.Models;
using System;

namespace DFile.backend.Services
{
    /// <summary>
    /// SINGLE SOURCE OF TRUTH for all depreciation calculations.
    /// This service implements the month-based depreciation system:
    /// - Storage: Cost, SalvageValue, TotalLifeMonths, UsedMonths, MonthlyDepreciation, AccumulatedDepreciation
    /// - Display: Derived values (RemainingMonths, LifeYears, RemainingYears)
    /// </summary>
    public class DepreciationCalculationService
    {
        /// <summary>
        /// Represents the current depreciation state of an asset.
        /// </summary>
        public class DepreciationState
        {
            public decimal Cost { get; set; }
            public decimal SalvageValue { get; set; }
            public int TotalLifeMonths { get; set; }
            public int UsedMonths { get; set; }
            public decimal MonthlyDepreciation { get; set; }
            public decimal AccumulatedDepreciation { get; set; }

            // CALCULATED / DERIVED VALUES (READ-ONLY)
            public int RemainingMonths => Math.Max(0, TotalLifeMonths - UsedMonths);
            public decimal LifeYears => Math.Round((decimal)TotalLifeMonths / 12M, 2);
            public decimal RemainingYears => Math.Round((decimal)RemainingMonths / 12M, 2);
            public decimal BookValue => Math.Max(0, Cost - AccumulatedDepreciation);
            
            public override string ToString() => 
                $"Cost={Cost}, TotalLife={TotalLifeMonths}mo, Used={UsedMonths}mo, " +
                $"Monthly={MonthlyDepreciation}, Accumulated={AccumulatedDepreciation}, " +
                $"Book={BookValue}";
        }

        /// <summary>
        /// Recalculates depreciation for an asset when its properties change.
        /// RULES:
        /// - DepreciableAmount = Cost - SalvageValue
        /// - MonthlyDepreciation = DepreciableAmount / TotalLifeMonths
        /// - AccumulatedDepreciation = MonthlyDepreciation * UsedMonths
        /// - If RemainingMonths <= 0, Depreciation stops (MonthlyDepreciation = 0, BookValue = SalvageValue)
        /// </summary>
        public DepreciationState CalculateDepreciation(
            decimal cost,
            decimal? salvageValue,
            int totalLifeMonths,
            int usedMonths)
        {
            // Validate inputs
            if (cost < 0) cost = 0;
            var sv = salvageValue ?? 0;
            if (sv < 0) sv = 0;
            if (sv > cost) sv = cost;
            if (totalLifeMonths < 1) totalLifeMonths = 1;
            if (usedMonths < 0) usedMonths = 0;
            if (usedMonths > totalLifeMonths) usedMonths = totalLifeMonths;

            // Calculate depreciation
            decimal depreciableAmount = cost - sv;
            int remainingMonths = Math.Max(0, totalLifeMonths - usedMonths);

            decimal monthlyDepreciation = 0;
            if (remainingMonths > 0 && totalLifeMonths > 0)
            {
                monthlyDepreciation = Math.Round(depreciableAmount / totalLifeMonths, 2);
            }

            decimal accumulatedDepreciation = 0;
            if (usedMonths > 0)
            {
                accumulatedDepreciation = Math.Round(monthlyDepreciation * usedMonths, 2);
                // Cap accumulated depreciation at depreciable amount
                if (accumulatedDepreciation > depreciableAmount)
                    accumulatedDepreciation = depreciableAmount;
            }

            return new DepreciationState
            {
                Cost = cost,
                SalvageValue = sv,  // Use the coalesced value, not nullable
                TotalLifeMonths = totalLifeMonths,
                UsedMonths = usedMonths,
                MonthlyDepreciation = monthlyDepreciation,
                AccumulatedDepreciation = accumulatedDepreciation
            };
        }

        /// <summary>
        /// Updates an asset with the calculated depreciation values.
        /// This is the ONLY place where asset depreciation fields should be modified.
        /// </summary>
        public void ApplyDepreciationToAsset(
            Asset asset,
            decimal cost,
            decimal? salvageValue,
            int totalLifeMonths,
            int usedMonths)
        {
            var state = CalculateDepreciation(cost, salvageValue, totalLifeMonths, usedMonths);

            asset.PurchasePrice = cost;
            asset.AcquisitionCost = cost;
            asset.SalvageValue = salvageValue;
            asset.TotalLifeMonths = totalLifeMonths;
            asset.UsedMonths = usedMonths;
            asset.MonthlyDepreciation = state.MonthlyDepreciation;
            asset.AccumulatedDepreciation = state.AccumulatedDepreciation;
            asset.CurrentBookValue = state.BookValue;
            asset.UpdatedAt = DateTime.UtcNow;
        }

        /// <summary>
        /// Advances depreciation by one month.
        /// This should be called by a background job or scheduler monthly.
        /// </summary>
        public void IncrementUsedMonths(Asset asset)
        {
            if (asset.UsedMonths < asset.TotalLifeMonths)
            {
                asset.UsedMonths++;
                
                // Recalculate with new UsedMonths
                var state = CalculateDepreciation(
                    asset.PurchasePrice,
                    asset.SalvageValue,
                    asset.TotalLifeMonths,
                    asset.UsedMonths);

                asset.AccumulatedDepreciation = state.AccumulatedDepreciation;
                asset.CurrentBookValue = state.BookValue;
                asset.MonthlyDepreciation = state.MonthlyDepreciation;
                asset.UpdatedAt = DateTime.UtcNow;
            }
        }

        /// <summary>
        /// Computes UsedMonths dynamically based on purchase date.
        /// This allows the system to track depreciation without monthly background jobs.
        /// </summary>
        public int ComputeUsedMonthsFromPurchaseDate(DateTime? purchaseDate)
        {
            if (!purchaseDate.HasValue || purchaseDate > DateTime.UtcNow)
                return 0;

            var now = DateTime.UtcNow;
            var monthsDiff = (now.Year - purchaseDate.Value.Year) * 12 +
                            (now.Month - purchaseDate.Value.Month);

            return Math.Max(0, monthsDiff);
        }

        /// <summary>
        /// Calculates all depreciation values using a dynamic computation from PurchaseDate.
        /// Useful for read-only depreciation reports without storing UsedMonths.
        /// </summary>
        public DepreciationState CalculateDepreciationDynamic(
            Asset asset)
        {
            int usedMonths = ComputeUsedMonthsFromPurchaseDate(asset.PurchaseDate);
            return CalculateDepreciation(
                asset.PurchasePrice,
                asset.SalvageValue ?? 0,
                asset.TotalLifeMonths,
                usedMonths);
        }
    }
}
