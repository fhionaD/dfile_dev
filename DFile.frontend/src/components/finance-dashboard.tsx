import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
    TrendingDown, AlertTriangle, PhilippinePeso,
    Wrench, BarChart3
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useAssets } from "@/hooks/use-assets";
import { useMaintenanceRecords } from "@/hooks/use-maintenance";
import { useFinanceKpi } from "@/hooks/use-finance-reports";

interface FinanceDashboardProps {
    cardClassName?: string;
    /** Full finance module analytics vs. tenant overview (KPIs + alerts only). */
    variant?: "full" | "summary";
}

export function FinanceDashboard({ cardClassName = "", variant = "full" }: FinanceDashboardProps) {
    const isFull = variant === "full";
    const router = useRouter();
    const { data: assets = [], isLoading: isLoadingAssets } = useAssets();
    const { data: records = [], isLoading: isLoadingRecords } = useMaintenanceRecords(false, { enabled: isFull });
    const { data: kpi, isLoading: isLoadingKpi } = useFinanceKpi({ enabled: isFull });

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

    // ── Maintenance Cost Analytics (FROM DATABASE) ──
    const maintenanceStats = useMemo(() => {
        // Use actual maintenance spend directly from KPI (all Expense decisions)
        const totalMaintenanceCost = kpi?.maintenanceSpendCost || 0;
        
        // Cost by Priority (for KPI display context only)
        const costByPriority: Record<string, number> = { High: 0, Medium: 0, Low: 0 };
        records.forEach(r => {
            if (r.financeDecision === "Expense" && r.maintenanceSpendCost && r.priority && costByPriority[r.priority] !== undefined) {
                costByPriority[r.priority] += r.maintenanceSpendCost;
            }
        });

        return { totalMaintenanceCost, costByPriority };
    }, [kpi, records]);

    // ── Procurement Spend (Replacement Costs) ──
    const procurementStats = useMemo(() => {
        // Procurement Spend = sum of all approved replacement costs
        let total = 0;
        records.forEach(r => {
            if (r.financeRequestType === "Replacement" && 
                (r.financeWorkflowStatus === "Approved" || r.financeWorkflowStatus === "Replacement Completed") &&
                r.replacementCost) {
                total += r.replacementCost;
            }
        });
        return { total };
    }, [records]);

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

    const isLoading = isLoadingAssets || (isFull && (isLoadingRecords || isLoadingKpi));

    if (isLoading) {
        const skeletonKpis = isFull ? 4 : 2;
        return (
            <div className="space-y-6">
                <div className={`grid gap-4 ${isFull ? "grid-cols-2 lg:grid-cols-4" : "grid-cols-1 sm:grid-cols-2 max-w-3xl"}`}>
                    {[...Array(skeletonKpis)].map((_, i) => <Card key={i} className={cardClassName}><div className="p-6"><Skeleton className="h-20 w-full" /></div></Card>)}
                </div>
                {isFull ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {[...Array(4)].map((_, i) => <Card key={i} className={cardClassName}><div className="p-6"><Skeleton className="h-56 w-full" /></div></Card>)}
                    </div>
                ) : null}
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
                    <p className="text-sm text-muted-foreground">
                        {variant === "summary"
                            ? "High-level portfolio and depreciation snapshot for your organization."
                            : "Asset portfolio, maintenance costs & procurement insights"}
                    </p>
                </div>
            </div>

            {/* KPI Row */}
            <div className={`grid gap-4 ${isFull ? "grid-cols-2 lg:grid-cols-4" : "grid-cols-1 sm:grid-cols-2 max-w-3xl"}`}>
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

                {isFull ? (
                    <>
                        {/* Maintenance Spend */}
                        <Card 
                            className={`relative overflow-hidden cursor-pointer transition-all hover:shadow-lg hover:border-blue-300 ${cardClassName}`}
                            onClick={() => router.push('/finance/reports/maintenance-spend-details')}
                        >
                            <div className="p-5 space-y-3">
                                <div className="flex items-center justify-between">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Maintenance Spend</p>
                                    <Wrench className="h-4 w-4 text-blue-600" />
                                </div>
                                <p className="text-2xl font-bold tracking-tight">{formatShort(maintenanceStats.totalMaintenanceCost)}</p>
                                <p className="text-xs text-muted-foreground">{kpi?.maintenanceExpenseCount || 0} expense records</p>
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-blue-300" />
                        </Card>

                        {/* Procurement Spend */}
                        <Card 
                            className={`relative overflow-hidden cursor-pointer transition-all hover:shadow-lg hover:border-purple-300 ${cardClassName}`}
                            onClick={() => router.push('/finance/reports/replacement-cost-details')}
                        >
                            <div className="p-5 space-y-3">
                                <div className="flex items-center justify-between">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Procurement Spend</p>
                                    <Wrench className="h-4 w-4 text-purple-600" />
                                </div>
                                <p className="text-2xl font-bold tracking-tight">{formatShort(procurementStats.total)}</p>
                                <p className="text-xs text-muted-foreground">From {kpi?.approvedReplacementCount || 0} replacements</p>
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-purple-300" />
                        </Card>
                    </>
                ) : null}
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

            {isFull ? (
            <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
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
            </div>
            ) : null}
        </div>
    );
}
