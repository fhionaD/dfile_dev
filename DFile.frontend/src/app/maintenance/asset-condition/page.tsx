"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Asset } from "@/types/asset";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { useMaintenanceContext } from "@/contexts/maintenance-context";

const AssetStats = dynamic(() => import("@/components/asset-stats").then(m => ({ default: m.AssetStats })), {
    loading: () => (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
                <Card key={i} className="p-6"><Skeleton className="h-20 w-full" /></Card>
            ))}
        </div>
    ),
});
const AssetTable = dynamic(() => import("@/components/asset-table").then(m => ({ default: m.AssetTable })), {
    loading: () => <Card className="p-6"><Skeleton className="h-[400px] w-full" /></Card>,
});
const AssetDetailsModal = dynamic(() => import("@/components/modals/asset-details-modal").then(m => ({ default: m.AssetDetailsModal })));

export default function AssetConditionPage() {
    const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    
    // Get glassmorphism setting from context
    const { enableGlassmorphism } = useMaintenanceContext();
    const cardClassName = enableGlassmorphism 
        ? "border border-white/20 bg-white/10 dark:bg-black/10 backdrop-blur-xl ring-1 ring-white/10" 
        : "";

    return (
        <>
            <div className="space-y-8">
                <AssetStats cardClassName={cardClassName} />
                <AssetTable
                    readOnly
                    onAssetClick={(asset) => {
                        setSelectedAsset(asset);
                        setIsDetailsModalOpen(true);
                    }}
                />
            </div>

            <AssetDetailsModal
                open={isDetailsModalOpen}
                onOpenChange={setIsDetailsModalOpen}
                asset={selectedAsset}
            />
        </>
    );
}
