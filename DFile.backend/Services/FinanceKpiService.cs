using DFile.backend.Data;
using DFile.backend.DTOs;
using Microsoft.EntityFrameworkCore;

namespace DFile.backend.Services
{
    /// <summary>
    /// Service for calculating Finance KPIs from database records.
    /// All calculations are done server-side to ensure accuracy and consistency.
    /// </summary>
    public class FinanceKpiService
    {
        private readonly AppDbContext _context;

        public FinanceKpiService(AppDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// Get Finance KPI summary for Reports dashboard.
        /// Calculations are based on database records, not temporary frontend values.
        /// </summary>
        public async Task<FinanceKpiDto> GetFinanceKpiAsync(int? tenantId = null)
        {
            var maintenanceQuery = _context.MaintenanceRecords.AsQueryable();
            var purchaseOrderQuery = _context.PurchaseOrders.AsQueryable();

            // Filter by tenant if not super admin
            if (tenantId.HasValue)
            {
                maintenanceQuery = maintenanceQuery.Where(m => m.TenantId == tenantId);
                purchaseOrderQuery = purchaseOrderQuery.Where(p => p.TenantId == tenantId);
            }

            // Calculate approved maintenance costs
            // Include both repairs (with Cost field) and replacements (with ReplacementCost field)
            // Status values: "Approved" for repairs, "Waiting for Replacement" or "Replacement Completed" for replacements
            var maintenanceMetrics = await maintenanceQuery
                .Where(m => !m.IsArchived)
                .Select(m => new
                {
                    m.Cost,
                    m.ReplacementCost,
                    m.FinanceRequestType,
                    m.FinanceWorkflowStatus,
                    m.MaintenanceSpendCost,
                    m.FinanceDecision
                })
                .ToListAsync();

            // Sum all approved maintenance costs (estimated costs, not actual spend)
            var totalEstimatedCost = maintenanceMetrics
                .Where(m =>
                    m.FinanceWorkflowStatus == "Approved" ||
                    m.FinanceWorkflowStatus == "Waiting for Replacement" ||
                    m.FinanceWorkflowStatus == "Replacement Completed")
                .Sum(m => m.Cost ?? 0);

            // Sum only replacement costs (these become Procurement Spend)
            var replacementAssetCost = maintenanceMetrics
                .Where(m =>
                    (m.FinanceWorkflowStatus == "Approved" ||
                     m.FinanceWorkflowStatus == "Waiting for Replacement" ||
                     m.FinanceWorkflowStatus == "Replacement Completed") &&
                    m.FinanceRequestType == "Replacement")
                .Sum(m => m.ReplacementCost ?? 0);

            // Sum maintenance spend costs (for "Treat as Expense" financial decisions - not filtered by workflow status)
            var maintenanceSpendCost = maintenanceMetrics
                .Where(m => m.FinanceDecision == "Expense" && m.MaintenanceSpendCost.HasValue && m.MaintenanceSpendCost > 0)
                .Sum(m => m.MaintenanceSpendCost.Value);

            // Count approved maintenance and replacements
            var approvedMaintenanceCount = maintenanceMetrics
                .Where(m =>
                    m.FinanceWorkflowStatus == "Approved" ||
                    m.FinanceWorkflowStatus == "Waiting for Replacement" ||
                    m.FinanceWorkflowStatus == "Replacement Completed")
                .Count();
            var approvedReplacementCount = maintenanceMetrics
                .Where(m =>
                    (m.FinanceWorkflowStatus == "Approved" ||
                     m.FinanceWorkflowStatus == "Waiting for Replacement" ||
                     m.FinanceWorkflowStatus == "Replacement Completed") &&
                    m.FinanceRequestType == "Replacement")
                .Count();

            // Count maintenance records treated as expenses
            var maintenanceExpenseCount = maintenanceMetrics
                .Where(m => m.FinanceDecision == "Expense" && m.MaintenanceSpendCost.HasValue && m.MaintenanceSpendCost > 0)
                .Count();

            // Calculate approved purchase order metrics
            var purchaseOrderMetrics = await purchaseOrderQuery
                .Where(p => p.Status == "Approved" || p.Status == "Delivered")
                .Select(p => new
                {
                    p.PurchasePrice
                })
                .ToListAsync();

            var approvedPurchaseOrderAmount = purchaseOrderMetrics
                .Sum(p => p.PurchasePrice);
            var approvedPurchaseOrderCount = purchaseOrderMetrics.Count;

            // Total Procurement Spend = Replacement Costs + Approved PO Amounts
            var totalProcurementSpend = replacementAssetCost + approvedPurchaseOrderAmount;

            return new FinanceKpiDto
            {
                TotalEstimatedCost = totalEstimatedCost,
                ApprovedPurchaseOrderAmount = approvedPurchaseOrderAmount,
                ReplacementAssetCost = replacementAssetCost,
                TotalProcurementSpend = totalProcurementSpend,
                MaintenanceSpendCost = maintenanceSpendCost,
                ApprovedMaintenanceCount = approvedMaintenanceCount,
                ApprovedPurchaseOrderCount = approvedPurchaseOrderCount,
                ApprovedReplacementCount = approvedReplacementCount,
                MaintenanceExpenseCount = maintenanceExpenseCount
            };
        }

        /// <summary>
        /// Get detailed breakdown of replacement asset costs for procurement report.
        /// Returns each approved replacement with its cost and related asset/PO information.
        /// </summary>
        public async Task<List<ReplacementProcurementDetailDto>> GetReplacementProcurementDetailsAsync(int? tenantId = null)
        {
            var query = _context.MaintenanceRecords
                .Include(m => m.Asset)
                .AsQueryable();

            if (tenantId.HasValue)
            {
                query = query.Where(m => m.TenantId == tenantId);
            }

            var details = await query
                .Where(m =>
                    !m.IsArchived &&
                    m.FinanceRequestType == "Replacement" &&
                    (m.FinanceWorkflowStatus == "Waiting for Replacement" ||
                     m.FinanceWorkflowStatus == "Replacement Completed") &&
                    m.ReplacementCost.HasValue &&
                    m.ReplacementCost > 0)
                .Select(m => new ReplacementProcurementDetailDto
                {
                    MaintenanceRecordId = m.Id,
                    RequestId = m.RequestId,
                    AssetId = m.AssetId,
                    AssetName = m.Asset!.AssetName,
                    AssetCode = m.Asset!.AssetCode,
                    ReplacementCost = m.ReplacementCost.Value,
                    ApprovedBy = m.ApprovedBy,
                    ApprovedAt = m.ApprovedAt,
                    LinkedPurchaseOrderId = m.LinkedPurchaseOrderId
                })
                .OrderByDescending(d => d.ApprovedAt)
                .ToListAsync();

            return details;
        }

        /// <summary>
        /// Get detailed breakdown of maintenance spend costs (actual expenses, not estimated).
        /// Returns each maintenance record where Finance selected "Treat as Expense" with actual maintenance spend cost.
        /// </summary>
        public async Task<List<MaintenanceSpendDetailDto>> GetMaintenanceSpendDetailsAsync(int? tenantId = null)
        {
            var query = _context.MaintenanceRecords
                .Include(m => m.Asset)
                .AsQueryable();

            if (tenantId.HasValue)
            {
                query = query.Where(m => m.TenantId == tenantId);
            }

            var details = await query
                .Where(m =>
                    !m.IsArchived &&
                    m.FinanceDecision == "Expense" &&
                    m.MaintenanceSpendCost.HasValue &&
                    m.MaintenanceSpendCost > 0)
                .Select(m => new MaintenanceSpendDetailDto
                {
                    MaintenanceRecordId = m.Id,
                    RequestId = m.RequestId,
                    AssetId = m.AssetId,
                    AssetName = m.Asset!.AssetName,
                    AssetCode = m.Asset!.AssetCode,
                    MaintenanceSpendCost = m.MaintenanceSpendCost.Value,
                    Description = m.Description,
                    Status = m.Status,
                    ApprovedBy = m.ApprovedBy,
                    ApprovedAt = m.ApprovedAt,
                    DateReported = m.DateReported
                })
                .OrderByDescending(d => d.ApprovedAt)
                .ToListAsync();

            return details;
        }
    }

    /// <summary>
    /// Detail view of maintenance spend item for reports.
    /// </summary>
    public class MaintenanceSpendDetailDto
    {
        public string MaintenanceRecordId { get; set; } = string.Empty;
        public string? RequestId { get; set; }
        public string AssetId { get; set; } = string.Empty;
        public string? AssetName { get; set; }
        public string? AssetCode { get; set; }
        public decimal MaintenanceSpendCost { get; set; }
        public string? Description { get; set; }
        public string? Status { get; set; }
        public string? ApprovedBy { get; set; }
        public DateTime? ApprovedAt { get; set; }
        public DateTime DateReported { get; set; }
    }

    /// <summary>
    /// Detail view of a replacement procurement item for reports.
    /// </summary>
    public class ReplacementProcurementDetailDto
    {
        public string MaintenanceRecordId { get; set; } = string.Empty;
        public string? RequestId { get; set; }
        public string AssetId { get; set; } = string.Empty;
        public string? AssetName { get; set; }
        public string? AssetCode { get; set; }
        public decimal ReplacementCost { get; set; }
        public string? ApprovedBy { get; set; }
        public DateTime? ApprovedAt { get; set; }
        public string? LinkedPurchaseOrderId { get; set; }
    }
}
