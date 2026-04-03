"use client";

import { Package, BarChart3, AlertTriangle, PhilippinePeso } from "lucide-react";
import { useAssets } from "@/hooks/use-assets";
import { StatCard, StatCardSkeleton } from "@/components/ui/stat-card";

interface AssetStatsProps {
    cardClassName?: string;
}

export function AssetStats({ cardClassName = "" }: AssetStatsProps) {
    const { data: assets = [], isLoading } = useAssets();
    const activeAssets = assets.filter(a => a.status !== 'Archived');

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                    <StatCardSkeleton key={i} className={cardClassName} />
                ))}
            </div>
        );
    }

    const totalAssets = activeAssets.length;
    const pendingReviewCount = activeAssets.filter(a => a.status === "Available" && (a.room === "—" || !a.room)).length;
    const originalValue = assets.reduce((sum, a) => sum + (a.purchasePrice || a.value || 0), 0);
    const bookValue = assets.reduce((sum, a) => sum + (a.currentBookValue || a.value || 0), 0);

    const formatCurrency = (val: number) => {
        if (val >= 1000000) return `₱${(val / 1000000).toFixed(1)}M`;
        if (val >= 1000) return `₱${(val / 1000).toFixed(1)}K`;
        return `₱${val.toLocaleString()}`;
    };

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
            <StatCard
                label="Total Assets"
                value={totalAssets.toLocaleString()}
                icon={Package}
                className={cardClassName}
            />
            <StatCard
                label="Unallocated / Pending"
                value={pendingReviewCount}
                icon={AlertTriangle}
                iconClassName="bg-amber-500/10 text-amber-600"
                valueClassName="text-amber-600"
                className={cardClassName}
            />
            <StatCard
                label="Original Portfolio Value"
                value={formatCurrency(originalValue)}
                icon={PhilippinePeso}
                iconClassName="bg-blue-500/10 text-blue-600"
                valueClassName="text-blue-600"
                className={cardClassName}
            />
            <StatCard
                label="Current Book Value"
                value={formatCurrency(bookValue)}
                icon={BarChart3}
                iconClassName="bg-emerald-500/10 text-emerald-600"
                valueClassName="text-emerald-600"
                className={cardClassName}
            />
        </div>
    );
}

