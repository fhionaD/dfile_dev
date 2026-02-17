"use client";

import { useState } from "react";
import { DepreciationView } from "@/components/depreciation-view";
import { AssetDetailsModal } from "@/components/modals/asset-details-modal";
import { Asset } from "@/types/asset";

export default function DepreciationPage() {
    const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

    const handleAssetClick = (asset: Asset) => {
        setSelectedAsset(asset);
        setIsDetailsModalOpen(true);
    };

    return (
        <>
            <DepreciationView
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
