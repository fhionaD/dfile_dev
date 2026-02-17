"use client";

import { AssetAllocationView } from "@/components/asset-allocation-view";
import { useAssets, useAllocateAsset } from "@/hooks/use-assets";
import { useRooms } from "@/hooks/use-rooms";

export default function AllocationPage() {
    const { data: assets = [] } = useAssets();
    const { data: rooms = [] } = useRooms();
    const allocateAssetMutation = useAllocateAsset();

    // Filter out archived assets
    const activeAssets = assets.filter(a => a.status !== 'Archived');

    return (
        <AssetAllocationView
            assets={activeAssets}
            rooms={rooms}
            onAllocate={async (assetId, roomId) => {
                await allocateAssetMutation.mutateAsync({ id: assetId, roomId });
            }}
        />
    );
}
