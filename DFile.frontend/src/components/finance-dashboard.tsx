import { useState, useMemo } from "react";
import {
    TrendingDown, TrendingUp, AlertTriangle, Building2, PhilippinePeso,
    Wrench, BarChart3, DollarSign, ArrowUpRight, ArrowDownRight, Package
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { StatusText } from "@/components/ui/status-text";
import { Skeleton } from "@/components/ui/skeleton";
import { useAssets } from "@/hooks/use-assets";
import { usePurchaseOrders } from "@/hooks/use-procurement";
import { useMaintenanceRecords } from "@/hooks/use-maintenance";

interface FinanceDashboardProps {
    cardClassName?: string;
}

export function FinanceDashboard({ cardClassName = "" }: FinanceDashboardProps) {
    const { data: assets = [], isLoading: isLoadingAssets } = useAssets();
    const { data: records = [], isLoading: isLoadingRecords } = useMaintenanceRecords();
    const { data: orders = [], isLoading: isLoadingOrders } = usePurchaseOrders();

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(amount);

    const formatShort = (amount: number) => {
        if (amount >= 1_000_000) return `₱${(amount / 1_000_000).toFixed(1)}M`;
        if (amount >= 1_000) return `₱${(amount / 1_000).toFixed(1)}K`;
        return `₱${amount.toLocaleString()}`;
    };

    // ── Financial KPIs ──
    const stats = useMemo(() => {
        let totalCost = 0, totalBookValue = 0, monthlyDep = 0, accDep = 0;

        assets.forEach(a => {
            if (a.status === "Archived" || a.status === "Disposed") return;
            const cost = a.purchasePrice || a.value || 0;
            const bv = a.currentBookValue ?? cost;
            totalCost += cost;
            totalBookValue += bv;
            monthlyDep += a.monthlyDepreciation || 0;
            accDep += Math.max(0, cost - bv);
        });

        return { totalCost, totalBookValue, monthlyDep, accDep: Math.max(0, accDep) };
    }, [assets]);

    // ── Maintenance Cost Analytics ──
    const maintenanceStats = useMemo(() => {
        let totalMaintenanceCost = 0;
        let completedCost = 0;
        let pendingCost = 0;
        const costByPriority: Record<string, number> = { High: 0, Medium: 0, Low: 0 };
        const costByStatus: Record<string, number> = {};
        const monthlyCosts: Record<string, number> = {};

        records.forEach(r => {
            const cost = r.cost || 0;
            totalMaintenanceCost += cost;
            if (r.status === "Completed") completedCost += cost;
            else pendingCost += cost;

            // By priority
            if (r.priority && costByPriority[r.priority] !== undefined) {
                costByPriority[r.priority] += cost;
            }
            // By status
            if (!costByStatus[r.status]) costByStatus[r.status] = 0;
            costByStatus[r.status] += cost;

            // Monthly trend (last 6 months)
            if (r.dateReported) {
                const d = new Date(r.dateReported);
                const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
                if (!monthlyCosts[key]) monthlyCosts[key] = 0;
                monthlyCosts[key] += cost;
            }
        });

        // Sort monthly and take last 6
        const sortedMonths = Object.entries(monthlyCosts)
            .sort(([a], [b]) => a.localeCompare(b))
            .slice(-6);

        const maxMonthlyCost = Math.max(...sortedMonths.map(([, v]) => v), 1);

        return { totalMaintenanceCost, completedCost, pendingCost, costByPriority, costByStatus, sortedMonths, maxMonthlyCost };
    }, [records]);

    // ── Room Costs ──
    const roomStats = useMemo(() => {
        const data: Record<string, { assetValue: number; maintenanceCost: number; assetCount: number }> = {};

        assets.forEach(a => {
            if (a.status === "Archived" || a.status === "Disposed") return;
            const room = a.room || "Unassigned";
            if (!data[room]) data[room] = { assetValue: 0, maintenanceCost: 0, assetCount: 0 };
            data[room].assetValue += a.currentBookValue ?? a.value ?? 0;
            data[room].assetCount++;
        });

        records.forEach(r => {
            if (r.cost && r.status === "Completed") {
                const asset = assets.find(a => a.id === r.assetId);
                const room = asset?.room || "Unassigned";
                if (!data[room]) data[room] = { assetValue: 0, maintenanceCost: 0, assetCount: 0 };
                data[room].maintenanceCost += r.cost;
            }
        });

        return Object.entries(data)
            .map(([room, d]) => ({ room, ...d }))
            .sort((a, b) => b.assetValue - a.assetValue)
            .slice(0, 6);
    }, [assets, records]);

    // ── Vendor Spend ──
    const vendorStats = useMemo(() => {
        const map: Record<string, number> = {};
        let total = 0;
        orders.forEach(o => {
            if (o.status === "Cancelled") return;
            const cost = o.purchasePrice || 0;
            total += cost;
            map[o.vendor] = (map[o.vendor] || 0) + cost;
        });
        const sorted = Object.entries(map).map(([vendor, amount]) => ({ vendor, amount })).sort((a, b) => b.amount - a.amount).slice(0, 5);
        return { total, sorted };
    }, [orders]);

    // ── Alerts ──
    const alerts = useMemo(() => {
        const eol = assets.filter(a => (a.currentBookValue || 0) <= 0 && a.status !== "Disposed" && a.status !== "Archived");
        const warranty = assets.filter(a => {
            if (!a.warrantyExpiry) return false;
            const days = (new Date(a.warrantyExpiry).getTime() - Date.now()) / 86400000;
            return days > 0 && days <= 30;
        });
        return { eol, warranty };
    }, [assets]);

    const isLoading = isLoadingAssets || isLoadingRecords || isLoadingOrders;

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => <Card key={i} className={cardClassName}><div className="p-6"><Skeleton className="h-20 w-full" /></div></Card>)}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {[...Array(4)].map((_, i) => <Card key={i} className={cardClassName}><div className="p-6"><Skeleton className="h-56 w-full" /></div></Card>)}
                </div>
            </div>
        );
    }

    const depPercent = stats.totalCost > 0 ? Math.round((stats.accDep / stats.totalCost) * 100) : 0;

    const statusColors: Record<string, string> = {
        Open: "bg-blue-500", Inspection: "bg-amber-500", Quoted: "bg-slate-400",
        "In Progress": "bg-orange-500", Completed: "bg-emerald-500", Scheduled: "bg-sky-500",
    };

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <BarChart3 className="h-5 w-5 text-primary" />
                </div>
                <div>
                    <h1 className="text-xl font-semibold tracking-tight">Financial Analytics</h1>
                    <p className="text-sm text-muted-foreground">Asset portfolio, maintenance costs & procurement insights</p>
                </div>
            </div>

            {/* KPI Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Portfolio Value */}
                <Card className={`relative overflow-hidden ${cardClassName}`}>
                    <div className="p-5 space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Portfolio Value</p>
                            <PhilippinePeso className="h-4 w-4 text-emerald-600" />
                        </div>
                        <p className="text-2xl font-bold tracking-tight">{formatShort(stats.totalBookValue)}</p>
                        <p className="text-xs text-muted-foreground">Original: {formatShort(stats.totalCost)}</p>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-emerald-300" />
                </Card>

                {/* Depreciation */}
                <Card className={`relative overflow-hidden ${cardClassName}`}>
                    <div className="p-5 space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Depreciation</p>
                            <TrendingDown className="h-4 w-4 text-amber-600" />
                        </div>
                        <p className="text-2xl font-bold tracking-tight">{formatShort(stats.monthlyDep)}<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
                        <div className="flex items-center gap-2">
                            <Progress value={depPercent} className="h-1.5 flex-1" />
                            <span className="text-xs text-muted-foreground font-mono">{depPercent}%</span>
                        </div>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-amber-300" />
                </Card>

                {/* Maintenance Spend */}
                <Card className={`relative overflow-hidden ${cardClassName}`}>
                    <div className="p-5 space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Maintenance Spend</p>
                            <Wrench className="h-4 w-4 text-blue-600" />
                        </div>
                        <p className="text-2xl font-bold tracking-tight">{formatShort(maintenanceStats.totalMaintenanceCost)}</p>
                        <p className="text-xs text-muted-foreground">{records.length} total records</p>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-blue-300" />
                </Card>

                {/* Procurement Spend */}
                <Card className={`relative overflow-hidden ${cardClassName}`}>
                    <div className="p-5 space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Procurement</p>
                            <Package className="h-4 w-4 text-purple-600" />
                        </div>
                        <p className="text-2xl font-bold tracking-tight">{formatShort(vendorStats.total)}</p>
                        <p className="text-xs text-muted-foreground">{orders.length} purchase orders</p>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-purple-300" />
                </Card>
            </div>

            {/* Alerts Banner */}
            {(alerts.eol.length > 0 || alerts.warranty.length > 0) && (
                <div className="flex flex-wrap gap-3">
                    {alerts.eol.length > 0 && (
                        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-sm">
                            <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
                            <span className="font-medium text-red-700 dark:text-red-400">{alerts.eol.length} asset(s) fully depreciated</span>
                        </div>
                    )}
                    {alerts.warranty.length > 0 && (
                        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm">
                            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                            <span className="font-medium text-amber-700 dark:text-amber-400">{alerts.warranty.length} warranty expiring within 30 days</span>
                        </div>
                    )}
                </div>
            )}

            {/* Analytics Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Monthly Cost Trend - Bar Chart */}
                <Card className={cardClassName}>
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-base">Monthly Maintenance Cost</CardTitle>
                            <Badge variant="outline" className="text-xs font-mono">Last 6 months</Badge>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {maintenanceStats.sortedMonths.length === 0 ? (
                            <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">No cost data available</div>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex items-end gap-2 h-40">
                                    {maintenanceStats.sortedMonths.map(([month, cost]) => {
                                        const height = Math.max(8, (cost / maintenanceStats.maxMonthlyCost) * 100);
                                        const label = new Date(month + "-01").toLocaleDateString("en", { month: "short" });
                                        return (
                                            <div key={month} className="flex-1 flex flex-col items-center gap-1" title={`${label}: ${formatCurrency(cost)}`}>
                                                <span className="text-[10px] text-muted-foreground font-mono">{formatShort(cost)}</span>
                                                <div
                                                    className="w-full rounded-t-md bg-gradient-to-t from-blue-600 to-blue-400 transition-all duration-500 hover:from-blue-500 hover:to-blue-300 min-h-[4px]"
                                                    style={{ height: `${height}%` }}
                                                />
                                                <span className="text-[11px] text-muted-foreground font-medium">{label}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Cost by Status - Horizontal bars */}
                <Card className={cardClassName}>
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-base">Cost Breakdown by Status</CardTitle>
                            <Badge variant="outline" className="text-xs font-mono">{formatShort(maintenanceStats.totalMaintenanceCost)}</Badge>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {Object.keys(maintenanceStats.costByStatus).length === 0 ? (
                            <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">No cost data</div>
                        ) : (
                            <div className="space-y-3">
                                {Object.entries(maintenanceStats.costByStatus)
                                    .sort(([, a], [, b]) => b - a)
                                    .map(([status, cost]) => {
                                        const pct = maintenanceStats.totalMaintenanceCost > 0 ? (cost / maintenanceStats.totalMaintenanceCost) * 100 : 0;
                                        return (
                                            <div key={status} className="space-y-1.5">
                                                <div className="flex items-center justify-between text-sm">
                                                    <div className="flex items-center gap-2">
                                                        <div className={`h-2.5 w-2.5 rounded-full ${statusColors[status] || "bg-gray-400"}`} />
                                                        <span className="font-medium">{status}</span>
                                                    </div>
                                                    <span className="font-mono text-muted-foreground">{formatCurrency(cost)}</span>
                                                </div>
                                                <div className="h-2 rounded-full bg-muted overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-500 ${statusColors[status] || "bg-gray-400"}`}
                                                        style={{ width: `${Math.max(2, pct)}%` }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Cost by Priority */}
                <Card className={cardClassName}>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">Cost by Priority Level</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-3 gap-4">
                            {(["High", "Medium", "Low"] as const).map(p => {
                                const cost = maintenanceStats.costByPriority[p];
                                const total = maintenanceStats.totalMaintenanceCost || 1;
                                const pct = Math.round((cost / total) * 100);
                                const colors = {
                                    High: { bg: "bg-red-500/10", text: "text-red-600", bar: "bg-red-500", border: "border-red-500/20" },
                                    Medium: { bg: "bg-amber-500/10", text: "text-amber-600", bar: "bg-amber-500", border: "border-amber-500/20" },
                                    Low: { bg: "bg-emerald-500/10", text: "text-emerald-600", bar: "bg-emerald-500", border: "border-emerald-500/20" },
                                }[p];
                                return (
                                    <div key={p} className={`rounded-xl border ${colors.border} ${colors.bg} p-4 text-center space-y-2`}>
                                        <p className={`text-xs font-semibold uppercase tracking-wider ${colors.text}`}>{p}</p>
                                        <p className="text-lg font-bold">{formatShort(cost)}</p>
                                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                            <div className={`h-full rounded-full ${colors.bar}`} style={{ width: `${Math.max(2, pct)}%` }} />
                                        </div>
                                        <p className="text-xs text-muted-foreground font-mono">{pct}%</p>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>

                {/* Top Vendor Spend */}
                <Card className={cardClassName}>
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-base">Top Vendor Spend</CardTitle>
                            <Badge variant="outline" className="text-xs font-mono">{vendorStats.sorted.length} vendors</Badge>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {vendorStats.sorted.length === 0 ? (
                            <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">No procurement data</div>
                        ) : (
                            <div className="space-y-2.5">
                                {vendorStats.sorted.map((v, i) => {
                                    const pct = vendorStats.total > 0 ? (v.amount / vendorStats.total) * 100 : 0;
                                    return (
                                        <div key={v.vendor} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                                                {i + 1}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-sm font-medium truncate">{v.vendor}</span>
                                                    <span className="font-mono text-xs text-muted-foreground ml-2">{formatCurrency(v.amount)}</span>
                                                </div>
                                                <div className="h-1 rounded-full bg-muted overflow-hidden">
                                                    <div className="h-full rounded-full bg-primary/60" style={{ width: `${pct}%` }} />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Cost by Room */}
            <Card className={cardClassName}>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-base">Cost Distribution by Room</CardTitle>
                        <Badge variant="outline" className="text-xs font-mono">Top {roomStats.length} rooms</Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    {roomStats.length === 0 ? (
                        <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">No room data</div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {roomStats.map(r => (
                                <div key={r.room} className="rounded-xl border p-4 space-y-3 hover:bg-muted/30 transition-colors">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Building2 className="h-4 w-4 text-muted-foreground" />
                                            <span className="text-sm font-semibold truncate">{r.room}</span>
                                        </div>
                                        <Badge variant="secondary" className="text-[10px] font-mono">{r.assetCount} assets</Badge>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-0.5">
                                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Asset Value</p>
                                            <p className="text-sm font-bold">{formatShort(r.assetValue)}</p>
                                        </div>
                                        <div className="space-y-0.5">
                                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Maintenance</p>
                                            <p className="text-sm font-bold">{formatShort(r.maintenanceCost)}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
