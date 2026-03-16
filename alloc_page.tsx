"use client";

import { AssetAllocationView } from "@/components/asset-allocation-view";
import { useAvailableAssets } from "@/hooks/use-assets";
import { useRooms } from "@/hooks/use-rooms";
import { useAllocateAsset, useDeallocateAsset, useActiveAllocations } from "@/hooks/use-allocations";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export default function AllocationPage() {
    const { data: availableAssets = [], isLoading: assetsLoading } = useAvailableAssets();
    const { data: allocations = [], isLoading: allocLoading } = useActiveAllocations();
    const { data: rooms = [], isLoading: roomsLoading } = useRooms();
    const allocate = useAllocateAsset();
    const deallocate = useDeallocateAsset();

    if (assetsLoading || roomsLoading || allocLoading) {
        return <Card className="p-6"><Skeleton className="h-[400px] w-full" /></Card>;
    }

    return (
        <AssetAllocationView
            availableAssets={availableAssets}
            allocations={allocations}
            rooms={rooms}
            onAllocate={(assetId, roomId, remarks) => allocate.mutate({ assetId, roomId, remarks })}
            onDeallocate={(assetId) => deallocate.mutate(assetId)}
            isPending={allocate.isPending || deallocate.isPending}
        />
    );
}
