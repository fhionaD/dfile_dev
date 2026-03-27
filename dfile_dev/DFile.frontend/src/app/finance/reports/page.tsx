"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FileBarChart, Package, DollarSign, TrendingDown, ShoppingCart } from "lucide-react";
import { CurrencyCell } from "@/components/ui/currency-cell";
import { useAssets } from "@/hooks/use-assets";
import { usePurchaseOrders } from "@/hooks/use-procurement";
import { useMaintenanceRecords } from "@/hooks/use-maintenance";

export default function ReportsPage() {
    const { data: assets = [], isLoading: assetsLoading } = useAssets();
    const { data: orders = [], isLoading: ordersLoading } = usePurchaseOrders();
    const { data: records = [], isLoading: maintLoading } = useMaintenanceRecords();

    const isLoading = assetsLoading || ordersLoading || maintLoading;

    const activeAssets = useMemo(() => assets.filter(a => !a.archived), [assets]);
    const totalAcquisitionCost = useMemo(() => activeAssets.reduce((sum, a) => sum + (a.purchasePrice ?? a.value ?? 0), 0), [activeAssets]);
    const totalCurrentValue = useMemo(() => activeAssets.reduce((sum, a) => sum + (a.currentBookValue ?? a.value ?? 0), 0), [activeAssets]);
    const totalDepreciation = totalAcquisitionCost - totalCurrentValue;
    const depreciationRate = totalAcquisitionCost > 0 ? ((totalDepreciation / totalAcquisitionCost) * 100) : 0;

    const approvedOrders = useMemo(() => orders.filter(o => o.status === "Approved" || o.status === "Delivered"), [orders]);
    const totalProcurementSpend = useMemo(() => approvedOrders.reduce((sum, o) => sum + o.purchasePrice, 0), [approvedOrders]);

    const totalMaintenanceCost = useMemo(() => records.reduce((sum, r) => sum + (r.cost ?? 0), 0), [records]);

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
                <Card>
                    <div className="p-5 space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">Total Acquisition Cost</p>
                            <DollarSign className="h-4 w-4 text-blue-600" />
                        </div>
                        {isLoading ? <Skeleton className="h-8 w-24" /> : <CurrencyCell value={totalAcquisitionCost} className="text-2xl font-bold" />}
                    </div>
                </Card>
                <Card>
                    <div className="p-5 space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">Current Book Value</p>
                            <Package className="h-4 w-4 text-emerald-600" />
                        </div>
                        {isLoading ? <Skeleton className="h-8 w-24" /> : <CurrencyCell value={totalCurrentValue} className="text-2xl font-bold text-emerald-600" />}
                    </div>
                </Card>
                <Card>
                    <div className="p-5 space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">Total Depreciation</p>
                            <TrendingDown className="h-4 w-4 text-amber-600" />
                        </div>
                        {isLoading ? <Skeleton className="h-8 w-24" /> : (
                            <div>
                                <CurrencyCell value={totalDepreciation} className="text-2xl font-bold text-amber-600" />
                                <p className="text-xs text-muted-foreground mt-1">{depreciationRate.toFixed(1)}% of acquisition cost</p>
                            </div>
                        )}
                    </div>
                </Card>
                <Card>
                    <div className="p-5 space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">Procurement Spend</p>
                            <ShoppingCart className="h-4 w-4 text-violet-600" />
                        </div>
                        {isLoading ? <Skeleton className="h-8 w-24" /> : <CurrencyCell value={totalProcurementSpend} className="text-2xl font-bold" />}
                    </div>
                </Card>
            </section>

            {/* Additional Summary */}
            <section className="grid gap-4 sm:grid-cols-3">
                <Card>
                    <div className="p-5 space-y-3">
                        <p className="text-sm font-medium text-muted-foreground">Active Assets</p>
                        {isLoading ? <Skeleton className="h-8 w-16" /> : <p className="text-2xl font-bold">{activeAssets.length}</p>}
                    </div>
                </Card>
                <Card>
                    <div className="p-5 space-y-3">
                        <p className="text-sm font-medium text-muted-foreground">Total Maintenance Cost</p>
                        {isLoading ? <Skeleton className="h-8 w-24" /> : <CurrencyCell value={totalMaintenanceCost} className="text-2xl font-bold" />}
                    </div>
                </Card>
                <Card>
                    <div className="p-5 space-y-3">
                        <p className="text-sm font-medium text-muted-foreground">Purchase Orders (Approved)</p>
                        {isLoading ? <Skeleton className="h-8 w-16" /> : <p className="text-2xl font-bold">{approvedOrders.length}</p>}
                    </div>
                </Card>
            </section>

            {/* Category Breakdown */}
            <Card>
                <CardHeader>
                    <CardTitle>Asset Value by Category</CardTitle>
                    <CardDescription>Breakdown of asset values across categories</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
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
        </div>
    );
}
