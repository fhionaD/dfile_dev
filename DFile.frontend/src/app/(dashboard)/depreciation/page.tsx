"use client";

import { useState } from "react";
import { DepreciationView } from "@/components/depreciation-view";
import { AssetDetailsModal } from "@/components/modals/asset-details-modal";
import { useData } from "@/contexts/data-context";
import { Asset } from "@/types/asset";

export default function DepreciationPage() {
    const { assets } = useData();
    const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

    const handleAssetClick = (asset: Asset) => {
        setSelectedAsset(asset);
        setIsDetailsModalOpen(true);
    };

    // Filter out archived assets
    const activeAssets = assets.filter(a => a.status !== 'Archived');

    return (
        <>
            <DepreciationView
                assets={activeAssets}
                onAssetClick={handleAssetClick}
            />
            <AssetDetailsModal
                open={isDetailsModalOpen}
                onOpenChange={setIsDetailsModalOpen}
                asset={selectedAsset}
            />
        </>
    );
}
