"use client";

import { useState } from "react";
import { MaintenanceView } from "@/components/maintenance-view";
import { CreateMaintenanceModal } from "@/components/modals/create-maintenance-modal";
import { MaintenanceDetailsModal } from "@/components/modals/maintenance-details-modal";
import { AcquisitionModal } from "@/components/modals/acquisition-modal";
import { useAssets } from "@/hooks/use-assets"; // Added import for useAssets
import { MaintenanceRecord, Asset } from "@/types/asset";

export default function MaintenancePage() {
    // Note: MaintenanceView is now self-contained with React Query
    // We just need state for the modals that are opened from the top level (if any), 
    // but MaintenanceView seems to handle most things.
    // However, looking at the code, MaintenanceView emits events like onScheduleMaintenance, etc.
    // Ideally MaintenanceView should handle the modals itself if it is "smart".
    // But currently MaintenancePage orchestrates them. 

    // Actually, looking at MaintenanceView refactor earlier (in finding), it handles its own data loading.
    // But it triggers `onScheduleMaintenance` prop. 
    // We should probably move the modals INTO MaintenanceView or keep them here but use hooks.
    // Let's keep them here for now but remove useData and use hooks for any data they need.

    const { data: assets = [] } = useAssets(); // Added useAssets hook

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [isAcquisitionModalOpen, setIsAcquisitionModalOpen] = useState(false);

    const [selectedRecord, setSelectedRecord] = useState<MaintenanceRecord | null>(null);
    const [selectedAssetIdForMaintenance, setSelectedAssetIdForMaintenance] = useState<string | null>(null);
    const [selectedAssetForReplacement, setSelectedAssetForReplacement] = useState<Asset | null>(null);

    // We need to fetch assets here if we want to pass them to modals... OR refactor modals to fetch their own data.
    // CreateMaintenanceModal takes `assets` and `records`. refactoring it to use hooks is better.
    // For now, let's assume we will refactor CreateMaintenanceModal and MaintenanceDetailsModal next.
    // So we just render them without the heavy props from useData.

    const handleCreateRequest = () => {
        setSelectedRecord(null);
        setSelectedAssetIdForMaintenance(null);
        setIsCreateModalOpen(true);
    };

    const handleRecordClick = (record: MaintenanceRecord) => {
        setSelectedRecord(record);
        setIsDetailsModalOpen(true);
    };

    const handleScheduleMaintenance = (assetId: string) => {
        setSelectedRecord(null);
        setSelectedAssetIdForMaintenance(assetId);
        setIsCreateModalOpen(true);
    };

    const handleRequestReplacement = (assetId: string) => {
        const asset = assets.find(a => a.id === assetId);
        if (asset) {
            setSelectedAssetForReplacement(asset);
            setIsAcquisitionModalOpen(true);
        }
    };

    // To make this easier: Let's import useAssets here.

    return (
        <>
            <MaintenanceView
                onScheduleMaintenance={handleScheduleMaintenance}
                onRequestReplacement={handleRequestReplacement}
            />

            <CreateMaintenanceModal
                key={selectedRecord ? selectedRecord.id : `create-maintenance-${selectedAssetIdForMaintenance}`}
                open={isCreateModalOpen}
                onOpenChange={(open) => {
                    setIsCreateModalOpen(open);
                    if (!open) {
                        setSelectedRecord(null);
                        setSelectedAssetIdForMaintenance(null);
                    }
                }}
                initialData={selectedRecord}
                defaultAssetId={selectedAssetIdForMaintenance}
            />

            <MaintenanceDetailsModal
                open={isDetailsModalOpen}
                onOpenChange={setIsDetailsModalOpen}
                record={selectedRecord}
                onEdit={() => {
                    setIsDetailsModalOpen(false);
                    setIsCreateModalOpen(true);
                }}
                onRequestReplacement={(assetId) => {
                    setIsDetailsModalOpen(false);
                    handleRequestReplacement(assetId);
                }}
            />

            <AcquisitionModal
                key={selectedAssetForReplacement ? `acquisition-${selectedAssetForReplacement.id}` : 'acquisition'}
                open={isAcquisitionModalOpen}
                onOpenChange={(open) => {
                    setIsAcquisitionModalOpen(open);
                    if (!open) setSelectedAssetForReplacement(null);
                }}
                replacementAsset={selectedAssetForReplacement}
            />
        </>
    );
}
