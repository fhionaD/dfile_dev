"use client";

import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, FileText } from "lucide-react";
import { CurrencyCell } from "@/components/ui/currency-cell";
import { useApprovedMaintenanceRecords } from "@/hooks/use-kpi-details";
import { exportToExcel, type ExportColumn } from "@/lib/export-excel";
import type { MaintenanceRecord } from "@/types/asset";

interface KpiDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "repairs" | "replacements" | "all";
  title: string;
}

export function KpiDetailsModal({
  open,
  onOpenChange,
  type,
  title,
}: KpiDetailsModalProps) {
  const { data: allRecords = [], isLoading } = useApprovedMaintenanceRecords({
    enabled: open,
  });
  const [isExporting, setIsExporting] = useState(false);

  // Filter records based on type
  const filteredRecords = useMemo(() => {
    return allRecords.filter((r) => {
      if (type === "repairs") return r.financeRequestType === "Repair";
      if (type === "replacements") return r.financeRequestType === "Replacement";
      return true; // all
    });
  }, [allRecords, type]);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const exportData = filteredRecords.map((r) => ({
        requestId: r.requestId || "—",
        assetId: r.assetId || "—",
        assetName: r.assetName || "—",
        assetCode: r.assetCode || "—",
        type: r.financeRequestType || "—",
        estimatedCost: r.cost ?? 0,
        replacementCost: r.replacementCost ?? 0,
        status: r.financeWorkflowStatus || "—",
        approvedBy: r.approvedBy || "—",
        approvedAt: r.approvedAt ? new Date(r.approvedAt).toLocaleDateString() : "—",
      }));

      const columns: ExportColumn[] = [
        { header: "Request ID", key: "requestId", width: 12 },
        { header: "Asset ID", key: "assetId", width: 15 },
        { header: "Asset Name", key: "assetName", width: 20 },
        { header: "Asset Code", key: "assetCode", width: 12 },
        { header: "Type", key: "type", width: 12 },
        {
          header: "Maintenance Cost (₱)",
          key: "estimatedCost",
          width: 18,
          format: (v) => (typeof v === "number" && v > 0 ? v.toFixed(2) : "—"),
        },
        {
          header: "Replacement Cost (₱)",
          key: "replacementCost",
          width: 18,
          format: (v) => (typeof v === "number" && v > 0 ? v.toFixed(2) : "—"),
        },
        { header: "Finance Status", key: "status", width: 18 },
        { header: "Approved By", key: "approvedBy", width: 15 },
        { header: "Approval Date", key: "approvedAt", width: 15 },
      ];

      await exportToExcel(exportData, columns, `KPI-${type}-${new Date().toISOString().split('T')[0]}`);
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-5xl w-[95vw] p-0 overflow-hidden flex flex-col">
        <DialogHeader className="p-6 bg-muted/40 border-b border-border shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription>
            Showing {filteredRecords.length} approved {type === "repairs" ? "repairs" : type === "replacements" ? "replacements" : "maintenance items"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-6 space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-muted-foreground">No approved items found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-muted/50">
                  <TableRow>
                    <TableHead>Request</TableHead>
                    <TableHead>Asset ID</TableHead>
                    <TableHead>Asset Name</TableHead>
                    <TableHead>Asset Code</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">
                      {type === "repairs" || type === "all" ? "Maintenance Cost" : "—"}
                    </TableHead>
                    {type === "replacements" || type === "all" ? (
                      <TableHead className="text-right">Replacement Cost</TableHead>
                    ) : null}
                    <TableHead>Finance Status</TableHead>
                    <TableHead>Approved By</TableHead>
                    <TableHead>Approval Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-mono text-xs">
                        {record.requestId || "—"}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {record.assetId || "—"}
                      </TableCell>
                      <TableCell className="max-w-sm truncate">
                        {record.assetName || "—"}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {record.assetCode || "—"}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                            record.financeRequestType === "Repair"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                              : "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300"
                          }`}
                        >
                          {record.financeRequestType || "—"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {type === "repairs" || type === "all" ? (
                          record.cost ? (
                            <CurrencyCell value={record.cost} className="text-xs" />
                          ) : (
                            "—"
                          )
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      {type === "replacements" || type === "all" ? (
                        <TableCell className="text-right">
                          {record.replacementCost ? (
                            <CurrencyCell value={record.replacementCost} className="text-xs" />
                          ) : (
                            "—"
                          )}
                        </TableCell>
                      ) : null}
                      <TableCell className="text-xs">
                        {record.financeWorkflowStatus || "—"}
                      </TableCell>
                      <TableCell className="text-xs">
                        {record.approvedBy || "—"}
                      </TableCell>
                      <TableCell className="text-xs">
                        {record.approvedAt
                          ? new Date(record.approvedAt).toLocaleDateString()
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-border flex justify-end gap-2 bg-muted/20 shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting || filteredRecords.length === 0}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            {isExporting ? "Exporting..." : "Export to Excel"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
