"use client";

import { Package, BarChart3, AlertTriangle, PhilippinePeso } from "lucide-react";
import { useAssets } from "@/hooks/use-assets";
import { Skeleton } from "@/components/ui/skeleton";

export function AssetStats() {
    const { data: assets = [], isLoading } = useAssets();
    const activeAssets = assets.filter(a => a.status !== 'Archived');

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-card  border border-border p-4 shadow-sm flex items-center justify-between">
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-8 w-16" />
                        </div>
                        <Skeleton className="h-10 w-10 rounded-full" />
                    </div>
                ))}
            </div>
        );
    }

    const totalAssets = activeAssets.length;

    // "Pending Review" proxy
    const pendingReviewCount = activeAssets.filter(a => a.status === "Available" && (a.room === "—" || !a.room)).length;

    // Calculate Values
    const originalValue = assets.reduce((sum, a) => sum + (a.purchasePrice || a.value || 0), 0);
    const bookValue = assets.reduce((sum, a) => sum + (a.currentBookValue || a.value || 0), 0);

    const formatCurrency = (val: number) => {
        if (val >= 1000000) return `₱${(val / 1000000).toFixed(1)}M`;
        if (val >= 1000) return `₱${(val / 1000).toFixed(1)}K`;
        return `₱${val.toLocaleString()}`;
    };

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-card  border border-border p-4 shadow-sm flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">Total Assets</p>
                <div className="flex items-center gap-2">
                    <h3 className="text-2xl font-bold text-primary">{totalAssets.toLocaleString()}</h3>
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <Package size={20} />
                    </div>
                </div>
            </div>

            <div className="bg-card  border border-border p-4 shadow-sm flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">Unallocated / Pending</p>
                <div className="flex items-center gap-2">
                    <h3 className="text-2xl font-bold text-amber-600">{pendingReviewCount}</h3>
                    <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600">
                        <AlertTriangle size={20} />
                    </div>
                </div>
            </div>

            <div className="bg-card  border border-border p-4 shadow-sm flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">Original Portfolio Value</p>
                <div className="flex items-center gap-2">
                    <h3 className="text-2xl font-bold text-blue-600">{formatCurrency(originalValue)}</h3>
                    <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600">
                        <PhilippinePeso size={20} />
                    </div>
                </div>
            </div>

            <div className="bg-card  border border-border p-4 shadow-sm flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">Current Book Value</p>
                <div className="flex items-center gap-2">
                    <h3 className="text-2xl font-bold text-emerald-600">{formatCurrency(bookValue)}</h3>
                    <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                        <BarChart3 size={20} />
                    </div>
                </div>
            </div>
        </div>
    );
}
