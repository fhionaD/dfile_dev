import { useState, useMemo } from "react";
import { TrendingDown, TrendingUp, AlertTriangle, Building2, Calendar, DollarSign, Package, PieChart, Info, Download, ArrowUpRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAssets } from "@/hooks/use-assets";
import { usePurchaseOrders } from "@/hooks/use-procurement";
import { useMaintenanceRecords } from "@/hooks/use-maintenance";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function FinanceDashboard() {
    const { data: assets = [], isLoading: isLoadingAssets } = useAssets();
    const { data: records = [], isLoading: isLoadingRecords } = useMaintenanceRecords();
    const { data: orders = [], isLoading: isLoadingOrders } = usePurchaseOrders();

    const [timeRange, setTimeRange] = useState("This Year");

    // --- KPI Calculations ---
    const financialStats = useMemo(() => {
        let totalCost = 0;
        let totalBookValue = 0;
        let monthlyDepreciation = 0;
        let accumulatedDepreciation = 0;

        assets.forEach(asset => {
            if (asset.status !== "Archived" && asset.status !== "Disposed") {
                const cost = asset.purchasePrice || asset.value || 0;
                const bookValue = asset.currentBookValue ?? cost; // Default to cost if undefined
                const monthly = asset.monthlyDepreciation || 0;
                
                totalCost += cost;
                totalBookValue += bookValue;
                monthlyDepreciation += monthly;
                accumulatedDepreciation += (cost - bookValue);
            }
        });

        // Ensure accumulated depreciation is explicitly positive or zero (floating point safety)
        accumulatedDepreciation = Math.max(0, accumulatedDepreciation);

        return { totalCost, totalBookValue, monthlyDepreciation, accumulatedDepreciation };
    }, [assets]);


    // --- Room-based Finance KPIs ---
    const roomStats = useMemo(() => {
        const stats: Record<string, { totalValue: number, depreciation: number, maintenanceCost: number }> = {};
        
        assets.forEach(asset => {
             if (asset.status !== "Archived" && asset.status !== "Disposed") {
                const room = asset.room || "Unassigned";
                if (!stats[room]) stats[room] = { totalValue: 0, depreciation: 0, maintenanceCost: 0 };
                
                stats[room].totalValue += (asset.currentBookValue ?? asset.value ?? 0);
                stats[room].depreciation += (asset.monthlyDepreciation ?? 0);
             }
        });

        records.forEach(record => {
            if (record.cost && record.status === "Completed") {
                // Find asset to get room
                const asset = assets.find(a => a.id === record.assetId);
                const room = asset?.room || "Unassigned";
                if (!stats[room]) stats[room] = { totalValue: 0, depreciation: 0, maintenanceCost: 0 };
                
                stats[room].maintenanceCost += record.cost;
            }
        });

        return Object.entries(stats)
            .map(([room, data]) => ({ room, ...data }))
            .sort((a, b) => b.totalValue - a.totalValue) // Sort by highest value
            .slice(0, 5); // Top 5 rooms
    }, [assets, records]);


    // --- Spending Summary ---
    const spendingStats = useMemo(() => {
        const topVendors: Record<string, number> = {};
        let totalProcurement = 0;

        orders.forEach(order => {
             if (order.status !== "Cancelled") {
                const cost = order.purchasePrice || 0;
                totalProcurement += cost;
                if (!topVendors[order.vendor]) topVendors[order.vendor] = 0;
                topVendors[order.vendor] += cost;
             }
        });

        const sortedVendors = Object.entries(topVendors)
            .map(([vendor, amount]) => ({ vendor, amount }))
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 5);

        return { totalProcurement, sortedVendors };
    }, [orders]);


    // --- Alerts ---
    const alerts = useMemo(() => {
        const eolAssets = assets.filter(a => (a.currentBookValue || 0) <= 0 && a.status !== "Disposed" && a.status !== "Archived");
        const warrantyExpiring = assets.filter(a => {
            if (!a.warrantyExpiry) return false;
            const expiry = new Date(a.warrantyExpiry);
            const now = new Date();
            const daysDiff = (expiry.getTime() - now.getTime()) / (1000 * 3600 * 24);
            return daysDiff > 0 && daysDiff <= 30; // Expiring in 30 days
        });

        return { eolAssets, warrantyExpiring };
    }, [assets]);


    // Helper for formatting currency
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(amount);
    };

    if (isLoadingAssets || isLoadingRecords || isLoadingOrders) {
         return <div className="p-8 text-center text-muted-foreground">Loading Finance Data...</div>;
    }

    return (
        <div className="space-y-8 pb-10">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Finance Dashboard</h1>
                    <p className="text-muted-foreground">Financial health, asset valuation, and spending overview.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Select value={timeRange} onValueChange={setTimeRange}>
                         <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder="Time Range" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="This Month">This Month</SelectItem>
                            <SelectItem value="This Quarter">This Quarter</SelectItem>
                            <SelectItem value="This Year">This Year</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm">
                        <Download className="mr-2 h-4 w-4" /> Export Report
                    </Button>
                </div>
            </div>

            {/* Portfolio KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                 <Card className="border-l-4 border-l-primary shadow-sm">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between space-y-0 pb-2">
                             <p className="text-sm font-medium text-muted-foreground">Total Asset Cost</p>
                             <DollarSign className="h-4 w-4 text-primary" />
                        </div>
                        <div className="text-2xl font-bold">{formatCurrency(financialStats.totalCost)}</div>
                        <p className="text-xs text-muted-foreground mt-1">+2.5% from last month</p>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-emerald-500 shadow-sm">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between space-y-0 pb-2">
                             <p className="text-sm font-medium text-muted-foreground">Current Book Value</p>
                             <TrendingUp className="h-4 w-4 text-emerald-500" />
                        </div>
                        <div className="text-2xl font-bold">{formatCurrency(financialStats.totalBookValue)}</div>
                        <p className="text-xs text-muted-foreground mt-1">{((financialStats.totalBookValue / financialStats.totalCost) * 100).toFixed(1)}% of original value</p>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-orange-500 shadow-sm">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between space-y-0 pb-2">
                             <p className="text-sm font-medium text-muted-foreground">Accumulated Depreciation</p>
                             <TrendingDown className="h-4 w-4 text-orange-500" />
                        </div>
                        <div className="text-2xl font-bold">{formatCurrency(financialStats.accumulatedDepreciation)}</div>
                        <p className="text-xs text-muted-foreground mt-1">Total value lost over time</p>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-indigo-500 shadow-sm">
                    <CardContent className="p-6">
                         <div className="flex items-center justify-between space-y-0 pb-2">
                             <p className="text-sm font-medium text-muted-foreground">Monthly Depreciation</p>
                             <Calendar className="h-4 w-4 text-indigo-500" />
                        </div>
                        <div className="text-2xl font-bold">{formatCurrency(financialStats.monthlyDepreciation)}</div>
                        <p className="text-xs text-muted-foreground mt-1">Recurring expense</p>
                    </CardContent>
                </Card>
            </div>

            {/* Spending & Room KPIs */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Room-based Valuation */}
                <Card className="col-span-1 shadow-sm border-border">
                    <CardHeader className="pb-3 border-b border-border bg-muted/20">
                         <CardTitle className="text-base font-semibold flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-primary" />
                            Asset Value by Room (Top 5)
                        </CardTitle>
                        <CardDescription>Consolidated book value and maintenance costs.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                        {roomStats.map((stat, i) => (
                            <div key={stat.room} className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <div className="font-medium">{stat.room}</div>
                                    <div className="font-semibold">{formatCurrency(stat.totalValue)}</div>
                                </div>
                                <Progress value={(stat.totalValue / financialStats.totalBookValue) * 100} className="h-2" />
                                <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>Maint: {formatCurrency(stat.maintenanceCost)}</span>
                                    <span>Depr: {formatCurrency(stat.depreciation)}/mo</span>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* Vendor Spend Analysis */}
                <Card className="col-span-1 shadow-sm border-border">
                    <CardHeader className="pb-3 border-b border-border bg-muted/20">
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                            <Package className="h-4 w-4 text-primary" />
                            Top Vendors by Spend
                        </CardTitle>
                        <CardDescription>Procurement spending distribution.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="space-y-4">
                            {spendingStats.sortedVendors.length === 0 ? (
                                <p className="text-center text-muted-foreground py-8">No procurement data available.</p>
                            ) : (
                                spendingStats.sortedVendors.map((vendor, i) => (
                                    <div key={vendor.vendor} className="flex items-center justify-between py-2 border-b last:border-0 border-border/50">
                                         <div className="flex items-center gap-3">
                                            <div className="bg-primary/10 w-8 h-8 rounded-full flex items-center justify-center text-primary text-xs font-bold">
                                                {i + 1}
                                            </div>
                                            <span className="font-medium text-sm">{vendor.vendor}</span>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className="font-bold text-sm">{formatCurrency(vendor.amount)}</span>
                                            <span className="text-[10px] text-muted-foreground">{(spendingStats.totalProcurement > 0 ? (vendor.amount / spendingStats.totalProcurement * 100).toFixed(1) : 0)}% of total</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        <div className="mt-6 pt-4 border-t border-border flex justify-between items-center text-sm">
                             <span className="text-muted-foreground">Total Procurement ({timeRange})</span>
                             <span className="font-bold text-lg">{formatCurrency(spendingStats.totalProcurement)}</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Alerts & Risks */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card className="shadow-sm border-l-4 border-l-red-500">
                    <CardHeader className="pb-2">
                         <CardTitle className="text-base font-semibold flex items-center text-red-600 gap-2">
                            <AlertTriangle className="h-4 w-4" />
                            Assets at End-of-Life
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-2">
                        <div className="text-3xl font-bold mb-1">{alerts.eolAssets.length}</div>
                        <p className="text-xs text-muted-foreground mb-4">Fully depreciated assets still in use.</p>
                        <Button variant="destructive" size="sm" className="w-full h-8 text-xs">Review Assets</Button>
                    </CardContent>
                </Card>

                 <Card className="shadow-sm border-l-4 border-l-amber-500">
                    <CardHeader className="pb-2">
                         <CardTitle className="text-base font-semibold flex items-center text-amber-600 gap-2">
                            <Info className="h-4 w-4" />
                            Warranty Expiring Soon
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-2">
                        <div className="text-3xl font-bold mb-1">{alerts.warrantyExpiring.length}</div>
                        <p className="text-xs text-muted-foreground mb-4">Assets with warranty expiring in 30 days.</p>
                        <Button variant="outline" size="sm" className="w-full h-8 text-xs border-amber-200 text-amber-700 hover:bg-amber-50">View Warranties</Button>
                    </CardContent>
                </Card>

                <Card className="shadow-sm border-l-4 border-l-blue-500">
                    <CardHeader className="pb-2">
                         <CardTitle className="text-base font-semibold flex items-center text-blue-600 gap-2">
                            <PieChart className="h-4 w-4" />
                            Budget Utilization
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-2">
                        <div className="text-3xl font-bold mb-1">68%</div>
                        <p className="text-xs text-muted-foreground mb-4">Procurement budget vs Actual Spend</p>
                        <Button variant="outline" size="sm" className="w-full h-8 text-xs border-blue-200 text-blue-700 hover:bg-blue-50">Finance Report</Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

