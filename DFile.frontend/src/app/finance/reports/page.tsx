"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FileBarChart, Package, DollarSign, TrendingDown, ShoppingCart, Calculator } from "lucide-react";
import { CurrencyCell } from "@/components/ui/currency-cell";
import { useAssets } from "@/hooks/use-assets";
import { useFinanceKpi } from "@/hooks/use-finance-reports";
import { KpiDetailsModal } from "@/components/modals/kpi-details-modal";

export default function ReportsPage() {
    const { data: assets = [], isLoading: assetsLoading } = useAssets();
    const { data: kpi, isLoading: kpiLoading } = useFinanceKpi();

    const [kpiDetailOpen, setKpiDetailOpen] = useState(false);
    const [kpiDetailType, setKpiDetailType] = useState<"repairs" | "replacements" | "all">("all");
    const [kpiDetailTitle, setKpiDetailTitle] = useState("KPI Details");

    const isLoading = assetsLoading || kpiLoading;

    const activeAssets = useMemo(() => assets.filter(a => !a.archived), [assets]);
    const totalAcquisitionCost = useMemo(() => activeAssets.reduce((sum, a) => sum + (a.purchasePrice ?? a.value ?? 0), 0), [activeAssets]);
    const totalCurrentValue = useMemo(() => activeAssets.reduce((sum, a) => sum + (a.currentBookValue ?? a.value ?? 0), 0), [activeAssets]);
    const totalDepreciation = totalAcquisitionCost - totalCurrentValue;
    const depreciationRate = totalAcquisitionCost > 0 ? ((totalDepreciation / totalAcquisitionCost) * 100) : 0;

    // Category breakdown
    const categoryBreakdown = useMemo(() => {
        const map: Record<string, { count: number; value: number; bookValue: number }> = {};
        activeAssets.forEach(a => {
            const cat = a.categoryName ?? "Uncategorized";
            if (!map[cat]) map[cat] = { count: 0, value: 0, bookValue: 0 };
            map[cat].count++;
            map[cat].value += a.purchasePrice ?? a.value ?? 0;
            map[cat].bookValue += a.currentBookValue ?? a.value ?? 0;
        });
        return Object.entries(map)
            .sort(([, a], [, b]) => b.value - a.value)
            .map(([name, data]) => ({ name, ...data }));
    }, [activeAssets]);

    const openKpiDetail = (type: "repairs" | "replacements" | "all", title: string) => {
        setKpiDetailType(type);
        setKpiDetailTitle(title);
        setKpiDetailOpen(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <FileBarChart className="h-5 w-5 text-primary" />
                </div>
                <div>
                    <h1 className="text-xl font-semibold tracking-tight">Financial Reports</h1>
                    <p className="text-sm text-muted-foreground">Asset financial summaries and analytics</p>
                </div>
            </div>

            {/* Key Financial Metrics */}
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Card className="cursor-pointer transition-colors hover:bg-muted/50" onClick={() => openKpiDetail("repairs", "Total Estimated Cost - Maintenance Records")}>
                    <div className="p-5 space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">Total Estimated Cost</p>
                            <DollarSign className="h-4 w-4 text-blue-600" />
                        </div>
                        {isLoading ? <Skeleton className="h-8 w-24" /> : <CurrencyCell value={kpi?.totalEstimatedCost ?? 0} className="text-2xl font-bold" />}
                        <p className="text-xs text-muted-foreground">
                            {kpi?.approvedMaintenanceCount ?? 0} approved maintenance items
                        </p>
                        <p className="text-xs text-primary/70">Click to view details</p>
                    </div>
                </Card>
                <Card className="cursor-pointer transition-colors hover:bg-muted/50" onClick={() => openKpiDetail("all", "Purchase Orders - Approved Orders")}>
                    <div className="p-5 space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">Purchase Orders (Approved)</p>
                            <ShoppingCart className="h-4 w-4 text-emerald-600" />
                        </div>
                        {isLoading ? <Skeleton className="h-8 w-24" /> : <CurrencyCell value={kpi?.approvedPurchaseOrderAmount ?? 0} className="text-2xl font-bold text-emerald-600" />}
                        <p className="text-xs text-muted-foreground">
                            {kpi?.approvedPurchaseOrderCount ?? 0} approved orders
                        </p>
                        <p className="text-xs text-primary/70">Click to view details</p>
                    </div>
                </Card>
                <Card className="cursor-pointer transition-colors hover:bg-muted/50" onClick={() => openKpiDetail("replacements", "Replacement Asset Cost - Approved Replacements")}>
                    <div className="p-5 space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">Replacement Asset Cost</p>
                            <Package className="h-4 w-4 text-orange-600" />
                        </div>
                        {isLoading ? <Skeleton className="h-8 w-24" /> : <CurrencyCell value={kpi?.replacementAssetCost ?? 0} className="text-2xl font-bold text-orange-600" />}
                        <p className="text-xs text-muted-foreground">
                            {kpi?.approvedReplacementCount ?? 0} approved replacements
                        </p>
                        <p className="text-xs text-primary/70">Click to view details</p>
                    </div>
                </Card>
                <Card className="cursor-pointer transition-colors hover:bg-muted/50" onClick={() => openKpiDetail("all", "Total Procurement Spend - All Procurement Items")}>
                    <div className="p-5 space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">Total Procurement Spend</p>
                            <Calculator className="h-4 w-4 text-violet-600" />
                        </div>
                        {isLoading ? <Skeleton className="h-8 w-24" /> : <CurrencyCell value={kpi?.totalProcurementSpend ?? 0} className="text-2xl font-bold text-violet-600" />}
                        <p className="text-xs text-muted-foreground">
                            PO + Replacement costs
                        </p>
                        <p className="text-xs text-primary/70">Click to view details</p>
                    </div>
                </Card>
            </section>

            {/* Asset Summary */}
            <section className="grid gap-4 sm:grid-cols-3">
                <Card>
                    <div className="p-5 space-y-3">
                        <p className="text-sm font-medium text-muted-foreground">Total Acquisition Cost</p>
                        {assetsLoading ? <Skeleton className="h-8 w-24" /> : <CurrencyCell value={totalAcquisitionCost} className="text-2xl font-bold" />}
                    </div>
                </Card>
                <Card>
                    <div className="p-5 space-y-3">
                        <p className="text-sm font-medium text-muted-foreground">Current Book Value</p>
                        {assetsLoading ? <Skeleton className="h-8 w-24" /> : <CurrencyCell value={totalCurrentValue} className="text-2xl font-bold text-emerald-600" />}
                    </div>
                </Card>
                <Card>
                    <div className="p-5 space-y-3">
                        <p className="text-sm font-medium text-muted-foreground">Total Depreciation</p>
                        {assetsLoading ? <Skeleton className="h-8 w-24" /> : (
                            <div>
                                <CurrencyCell value={totalDepreciation} className="text-2xl font-bold text-amber-600" />
                                <p className="text-xs text-muted-foreground mt-1">{depreciationRate.toFixed(1)}%</p>
                            </div>
                        )}
                    </div>
                </Card>
            </section>

            {/* Category Breakdown */}
            <Card>
                <CardHeader>
                    <CardTitle>Asset Value by Category</CardTitle>
                    <CardDescription>Breakdown of asset values across categories ({activeAssets.length} total active assets)</CardDescription>
                </CardHeader>
                <CardContent>
                    {assetsLoading ? (
                        <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
                    ) : categoryBreakdown.length === 0 ? (
                        <p className="text-center py-8 text-muted-foreground">No asset data available</p>
                    ) : (
                        <div className="space-y-3">
                            {categoryBreakdown.map(cat => {
                                const pct = totalAcquisitionCost > 0 ? (cat.value / totalAcquisitionCost) * 100 : 0;
                                return (
                                    <div key={cat.name} className="space-y-1.5">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="font-medium">{cat.name} <span className="text-muted-foreground">({cat.count})</span></span>
                                            <CurrencyCell value={cat.value} className="font-medium" />
                                        </div>
                                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                                            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                                        </div>
                                        <div className="flex justify-between text-xs text-muted-foreground">
                                            <span>Book value: <CurrencyCell value={cat.bookValue} /></span>
                                            <span>{pct.toFixed(1)}%</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* KPI Details Modal */}
            <KpiDetailsModal
                open={kpiDetailOpen}
                onOpenChange={setKpiDetailOpen}
                type={kpiDetailType}
                title={kpiDetailTitle}
            />
        </div>
    );
}
