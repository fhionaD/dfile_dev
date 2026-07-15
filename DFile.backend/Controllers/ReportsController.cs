using DFile.backend.DTOs;
using DFile.backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace DFile.backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class ReportsController : TenantAwareController
    {
        private readonly FinanceKpiService _kpiService;

        public ReportsController(FinanceKpiService kpiService)
        {
            _kpiService = kpiService;
        }

        /// <summary>
        /// Get Finance KPIs for the Reports dashboard.
        /// Returns aggregated totals for estimated costs, purchase orders, and procurement spend.
        /// Calculated server-side from database records for accuracy and consistency.
        /// </summary>
        /// <remarks>
        /// KPI calculations include:
        /// - Total Estimated Cost: Sum of all approved maintenance record costs (repairs).
        /// - Approved Purchase Order Amount: Sum of all approved/delivered PO amounts.
        /// - Replacement Asset Cost: Sum of replacement costs approved by Finance (becomes Procurement Spend).
        /// - Total Procurement Spend: ReplacementAssetCost + ApprovedPurchaseOrderAmount.
        /// </remarks>
        [HttpGet("finance-kpi")]
        public async Task<ActionResult<FinanceKpiDto>> GetFinanceKpi()
        {
            var tenantId = GetCurrentTenantId();
            var kpi = await _kpiService.GetFinanceKpiAsync(tenantId);
            return Ok(kpi);
        }

        /// <summary>
        /// Get detailed breakdown of replacement asset costs for procurement report.
        /// Returns each approved replacement with its cost, asset, and approval details.
        /// </summary>
        /// <remarks>
        /// Details include:
        /// - Maintenance record ID and request ID
        /// - Associated asset name and code
        /// - Replacement cost amount
        /// - Finance approval info (approver and timestamp)
        /// - Linked purchase order ID (if any)
        /// 
        /// Sorted by approval date (newest first).
        /// </remarks>
        [HttpGet("replacement-procurement-details")]
        public async Task<ActionResult<List<ReplacementProcurementDetailDto>>> GetReplacementProcurementDetails()
        {
            var tenantId = GetCurrentTenantId();
            var details = await _kpiService.GetReplacementProcurementDetailsAsync(tenantId);
            return Ok(details);
        }
    }
}
