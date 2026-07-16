/**
 * Finance KPI summary for Reports dashboard.
 * Server-side calculated aggregates from approved maintenance and purchase orders.
 */
export interface FinanceKpi {
  /** Total estimated cost of all approved maintenance records (repairs and replacements) */
  totalEstimatedCost: number;

  /** Sum of all approved purchase order amounts */
  approvedPurchaseOrderAmount: number;

  /** Sum of replacement costs recorded during Finance approval (Procurement Spend) */
  replacementAssetCost: number;

  /** Total Procurement Spend = replacementAssetCost + approvedPurchaseOrderAmount */
  totalProcurementSpend: number;

  /** Sum of all actual maintenance spend costs (for "Treat as Expense" financial decisions) */
  maintenanceSpendCost: number;

  /** Count of approved maintenance records (repairs + replacements) */
  approvedMaintenanceCount: number;

  /** Count of approved purchase orders */
  approvedPurchaseOrderCount: number;

  /** Count of approved replacements with costs recorded */
  approvedReplacementCount: number;

  /** Count of maintenance records treated as expenses */
  maintenanceExpenseCount: number;
}

/**
 * Detail view of a maintenance spend item for reports.
 * Represents actual maintenance expense (not estimated cost).
 */
export interface MaintenanceSpendDetail {
  maintenanceRecordId: string;
  requestId?: string;
  assetId: string;
  assetName?: string;
  assetCode?: string;
  maintenanceSpendCost: number;
  description?: string;
  status?: string;
  approvedBy?: string;
  approvedAt?: string;
  dateReported: string;
}

/**
 * Detail view of a replacement procurement item for reports.
 */
export interface ReplacementProcurementDetail {
  maintenanceRecordId: string;
  requestId?: string;
  assetId: string;
  assetName?: string;
  assetCode?: string;
  replacementCost: number;
  approvedBy?: string;
  approvedAt?: string;
  linkedPurchaseOrderId?: string;
}
