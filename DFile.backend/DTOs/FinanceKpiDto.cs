namespace DFile.backend.DTOs
{
    /// <summary>
    /// Finance KPI summary for Reports dashboard.
    /// Aggregates costs from approved repairs, replacements, and purchase orders.
    /// </summary>
    public class FinanceKpiDto
    {
        /// <summary>Total estimated cost of all approved maintenance records (repairs and replacements).</summary>
        public decimal TotalEstimatedCost { get; set; }

        /// <summary>Sum of all approved purchase order amounts.</summary>
        public decimal ApprovedPurchaseOrderAmount { get; set; }

        /// <summary>Sum of replacement costs recorded during Finance approval (Procurement Spend).</summary>
        public decimal ReplacementAssetCost { get; set; }

        /// <summary>Total Procurement Spend = ReplacementAssetCost + ApprovedPurchaseOrderAmount.</summary>
        public decimal TotalProcurementSpend { get; set; }

        /// <summary>Count of approved maintenance records (repairs + replacements).</summary>
        public int ApprovedMaintenanceCount { get; set; }

        /// <summary>Count of approved purchase orders.</summary>
        public int ApprovedPurchaseOrderCount { get; set; }

        /// <summary>Count of approved replacements with costs recorded.</summary>
        public int ApprovedReplacementCount { get; set; }
    }
}
