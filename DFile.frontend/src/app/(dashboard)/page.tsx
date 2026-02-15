"use client";

import { useState } from "react";
import { AssetStats } from "@/components/asset-stats";
import { AssetTable } from "@/components/asset-table";
import { AssetDetailsModal } from "@/components/modals/asset-details-modal";
import { useData } from "@/contexts/data-context";
import { Asset } from "@/types/asset";

export default function DashboardPage() {
    const { assets, archiveAsset } = useData();
    const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

    const handleAssetClick = (asset: Asset) => {
        setSelectedAsset(asset);
        setIsDetailsModalOpen(true);
    };

    return (
        <div className="space-y-6">
            <AssetStats assets={assets} />
            <AssetTable
                assets={assets}
                onAssetClick={handleAssetClick}
                onArchiveAsset={archiveAsset}
            />

            <AssetDetailsModal
                open={isDetailsModalOpen}
                onOpenChange={setIsDetailsModalOpen}
                asset={selectedAsset}
            />
        </div>
    );
}
