"use client";

import { AssetAllocationView } from "@/components/asset-allocation-view";
import { useData } from "@/contexts/data-context";

export default function AllocationPage() {
    const { assets, rooms, allocateAsset } = useData();

    // Filter out archived assets
    const activeAssets = assets.filter(a => a.status !== 'Archived');

    return (
        <AssetAllocationView
            assets={activeAssets}
            rooms={rooms}
            onAllocate={allocateAsset}
        />
    );
}
