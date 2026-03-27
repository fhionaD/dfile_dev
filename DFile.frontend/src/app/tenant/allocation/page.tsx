"use client";

import { AssetAllocationView } from "@/components/asset-allocation-view";
import { useAssets } from "@/hooks/use-assets";
import { useRooms } from "@/hooks/use-rooms";
import { useAllocateAsset, useDeallocateAsset } from "@/hooks/use-allocations";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export default function AllocationPage() {
    const { data: assets = [], isLoading: assetsLoading } = useAssets();
    const { data: rooms = [], isLoading: roomsLoading } = useRooms();
    const allocate = useAllocateAsset();
    const deallocate = useDeallocateAsset();

    if (assetsLoading || roomsLoading) {
        return <Card className="p-6"><Skeleton className="h-[400px] w-full" /></Card>;
    }

    return (
        <AssetAllocationView
            assets={assets}
            rooms={rooms}
            onAllocate={(assetId, roomId, remarks) => allocate.mutate({ assetId, roomId, remarks: remarks || '' })}
            onDeallocate={(assetId) => deallocate.mutate(assetId)}
            isPending={allocate.isPending || deallocate.isPending}
        />
    );
}
