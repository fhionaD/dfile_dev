import { useState, useMemo } from "react";
import { TrendingDown, TrendingUp, AlertTriangle, Building2, Calendar, PhilippinePeso, Package, PieChart, Info, Download, ArrowUpRight } from "lucide-react";
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
        <div className="space-y-6">
            <div className="mb-4">
                <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                    Dashboard
                </h1>
            </div>

            {/* KPI Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-card  border border-border p-4 shadow-sm flex flex-col justify-between space-y-2">
                    <div className="flex justify-between items-start">
                        <p className="text-sm font-medium text-muted-foreground">Portfolio Value</p>
                        <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-600">
                             <PhilippinePeso size={18} />
                        </div>
                    </div>
                    <div>
                        <h3 className="text-2xl font-bold text-foreground">₱{(financialStats.totalBookValue / 1000000).toFixed(1)}M</h3>
                        <p className="text-xs text-muted-foreground mt-1">
                             Original: ₱{(financialStats.totalCost / 1000000).toFixed(1)}M
                        </p>
                    </div>
                </div>

                <div className="bg-card  border border-border p-4 shadow-sm flex flex-col justify-between space-y-2">
                    <div className="flex justify-between items-start">
                        <p className="text-sm font-medium text-muted-foreground">Monthly Depreciation</p>
                        <div className="p-2 bg-amber-500/10 rounded-lg text-amber-600">
                             <TrendingDown size={18} />
                        </div>
                    </div>
                    <div>
                        <h3 className="text-2xl font-bold text-foreground">₱{financialStats.monthlyDepreciation.toLocaleString()}</h3>
                        <p className="text-xs text-muted-foreground mt-1">
                             Accumulated: ₱{(financialStats.accumulatedDepreciation / 1000000).toFixed(2)}M
                        </p>
                    </div>
                </div>
                 
                <div className="bg-card  border border-border p-4 shadow-sm flex flex-col justify-between space-y-2">
                    <div className="flex justify-between items-start">
                        <p className="text-sm font-medium text-muted-foreground">YTD Spend</p>
                        <div className="p-2 bg-blue-500/10 rounded-lg text-blue-600">
                             <TrendingUp size={18} />
                        </div>
                    </div>
                    <div>
                         <h3 className="text-2xl font-bold text-foreground">₱{spendingStats.totalProcurement.toLocaleString()}</h3>
                         <p className="text-xs text-muted-foreground mt-1">
                             Across {orders.length} orders
                        </p>
                    </div>
                </div>

                <div className="bg-card  border border-border p-4 shadow-sm flex flex-col justify-between space-y-2">
                    <div className="flex justify-between items-start">
                        <p className="text-sm font-medium text-muted-foreground">Top Cost Center</p>
                        <div className="p-2 bg-purple-500/10 rounded-lg text-purple-600">
                             <Building2 size={18} />
                        </div>
                    </div>
                    <div>
                         <h3 className="text-xl font-bold text-foreground truncate">{roomStats[0]?.room || "N/A"}</h3>
                         <p className="text-xs text-muted-foreground mt-1">
                             ₱{(roomStats[0]?.totalValue || 0).toLocaleString()} in assets
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Cost Distribution */}
                <Card className="border-border  shadow-sm">
                    <CardHeader className="border-b border-border bg-muted/40 py-4 px-6 rounded-t-xl">
                        <CardTitle className="text-base font-semibold">Cost by Room / Location</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="space-y-4">
                            {roomStats.map((room, i) => (
                                <div key={room.room} className="space-y-1">
                                    <div className="flex justify-between text-sm">
                                        <span className="font-medium">{room.room}</span>
                                        <span className="text-muted-foreground">₱{room.totalValue.toLocaleString()}</span>
                                    </div>
                                    <Progress value={(room.totalValue / (roomStats[0]?.totalValue || 1)) * 100} className="h-2" />
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                 {/* Vendor Spend */}
                <Card className="border-border  shadow-sm">
                    <CardHeader className="border-b border-border bg-muted/40 py-4 px-6 rounded-t-xl">
                         <CardTitle className="text-base font-semibold">Top Vendor Spend</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="space-y-4">
                             {spendingStats.sortedVendors.map((vendor, i) => (
                                <div key={vendor.vendor} className="flex items-center justify-between p-3 border border-border rounded-lg bg-card hover:bg-muted/30 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                                            {i + 1}
                                        </div>
                                        <span className="font-medium text-sm">{vendor.vendor}</span>
                                    </div>
                                    <span className="font-mono text-sm">₱{vendor.amount.toLocaleString()}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

