"use client";

import { useState } from "react";
import { MaintenanceView } from "@/components/maintenance-view";
import { CreateMaintenanceModal } from "@/components/modals/create-maintenance-modal";
import { MaintenanceDetailsModal } from "@/components/modals/maintenance-details-modal";
import { AcquisitionModal } from "@/components/modals/acquisition-modal";
import { useData } from "@/contexts/data-context";
import { MaintenanceRecord, Asset } from "@/types/asset";

export default function MaintenancePage() {
    const {
        maintenanceRecords,
        assets,
        addMaintenanceRecord,
        updateMaintenanceRecord,
        archiveMaintenanceRecord,
        updateMaintenanceStatus,
        assetCategories,
        createOrder
    } = useData();

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
        <>
            <MaintenanceView
                records={maintenanceRecords}
                assets={assets}
                onCreateRequest={handleCreateRequest}
                onRecordClick={handleRecordClick}
                onArchiveRecord={archiveMaintenanceRecord}
                onEditRecord={(record) => {
                    setSelectedRecord(record);
                    setIsCreateModalOpen(true);
                }}
                onScheduleMaintenance={handleScheduleMaintenance}
                onUpdateStatus={updateMaintenanceStatus}
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
                assets={assets}
                records={maintenanceRecords}
                onAddRecord={addMaintenanceRecord}
                onUpdateRecord={updateMaintenanceRecord}
                initialData={selectedRecord}
                defaultAssetId={selectedAssetIdForMaintenance}
            />

            <MaintenanceDetailsModal
                open={isDetailsModalOpen}
                onOpenChange={setIsDetailsModalOpen}
                record={selectedRecord}
                assetName={selectedRecord ? assets.find(a => a.id === selectedRecord.assetId)?.desc : undefined}
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
                categories={assetCategories}
                onCreateOrder={(order, asset) => {
                    createOrder(order, asset);
                    setIsAcquisitionModalOpen(false);
                }}
                replacementAsset={selectedAssetForReplacement}
            />
        </>
    );
}
