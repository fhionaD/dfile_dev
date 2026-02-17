"use client";

import { useState } from "react";
import { MaintenanceDashboard } from "@/components/maintenance-dashboard";
import { MaintenanceOperations } from "@/components/maintenance-operations";
import { CreateMaintenanceModal } from "@/components/modals/create-maintenance-modal";
import { MaintenanceDetailsModal } from "@/components/modals/maintenance-details-modal";
import { AcquisitionModal } from "@/components/modals/acquisition-modal";
import { useAssets } from "@/hooks/use-assets";
import { MaintenanceRecord, Asset } from "@/types/asset";
import { Separator } from "@/components/ui/separator";

export default function MaintenancePage() {
    const { data: assets = [] } = useAssets();

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [isAcquisitionModalOpen, setIsAcquisitionModalOpen] = useState(false);

    const [selectedRecord, setSelectedRecord] = useState<MaintenanceRecord | null>(null);
    const [selectedAssetIdForMaintenance, setSelectedAssetIdForMaintenance] = useState<string | null>(null);
    const [selectedAssetForReplacement, setSelectedAssetForReplacement] = useState<Asset | null>(null);

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

    return (
        <div className="space-y-12 pb-10">
            {/* 🔵 Maintenance Dashboard = Strategic Overview */}
            <section>
                <MaintenanceDashboard 
                    onScheduleMaintenance={handleScheduleMaintenance}
                />
            </section>

            <Separator className="my-8" />

            {/* 🟢 Asset Maintenance & Repair = Operational Control */}
            <section>
                <MaintenanceOperations 
                    onCreateRequest={handleCreateRequest}
                    onRecordClick={handleRecordClick}
                />
            </section>

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
        </div>
    );
}
