"use client";

import { Package, BarChart3, AlertTriangle, DollarSign } from "lucide-react";
import { Asset } from "@/types/asset";

interface AssetStatsProps {
    assets: Asset[];
}

export function AssetStats({ assets }: AssetStatsProps) {
    const totalAssets = assets.length;

    // "Pending Review" proxy: Assets with default/missing room allocation (Available but not In Use/Maintenance/etc, or explicit logic)
    // For now, let's use "Available" assets as "Ready to Deploy" or similar, 
    // OR sticking to the card label "Pending Review" -> maybe Unallocated assets?
    // Let's us "Unallocated" (Status Available) roughly.
    const pendingReviewCount = assets.filter(a => a.status === "Available" && (a.room === "—" || !a.room)).length;

    // Calculate Values
    const originalValue = assets.reduce((sum, a) => sum + (a.purchasePrice || a.value || 0), 0);
    const bookValue = assets.reduce((sum, a) => sum + (a.currentBookValue || a.value || 0), 0);

    const formatCurrency = (val: number) => {
        if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
        if (val >= 1000) return `$${(val / 1000).toFixed(1)}K`;
        return `$${val.toLocaleString()}`;
    };

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-card rounded-xl border border-border p-4 shadow-sm flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Assets</p>
                    <h3 className="text-2xl font-bold text-primary mt-1">{totalAssets.toLocaleString()}</h3>
                </div>
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <Package size={20} />
                </div>
            </div>

            <div className="bg-card rounded-xl border border-border p-4 shadow-sm flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-muted-foreground">Unallocated / Pending</p>
                    <h3 className="text-2xl font-bold text-amber-600 mt-1">{pendingReviewCount}</h3>
                </div>
                <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600">
                    <AlertTriangle size={20} />
                </div>
            </div>

            <div className="bg-card rounded-xl border border-border p-4 shadow-sm flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-muted-foreground">Original Portfolio Value</p>
                    <h3 className="text-2xl font-bold text-blue-600 mt-1">{formatCurrency(originalValue)}</h3>
                </div>
                <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600">
                    <DollarSign size={20} />
                </div>
            </div>

            <div className="bg-card rounded-xl border border-border p-4 shadow-sm flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-muted-foreground">Current Book Value</p>
                    <h3 className="text-2xl font-bold text-emerald-600 mt-1">{formatCurrency(bookValue)}</h3>
                </div>
                <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                    <BarChart3 size={20} />
                </div>
            </div>
        </div>
    );
}
