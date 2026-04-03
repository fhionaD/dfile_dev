"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { useAssets } from "@/hooks/use-assets";
import { useMaintenanceContext } from "@/contexts/maintenance-context";
import { MaintenanceRecord, Asset } from "@/types/asset";

const MaintenanceOperations = dynamic(() => import("@/components/maintenance-operations").then(m => ({ default: m.MaintenanceOperations })), {
    loading: () => <Card className="p-5"><Skeleton className="h-64 w-full" /></Card>,
});
const CreateMaintenanceModal = dynamic(() => import("@/components/modals/create-maintenance-modal").then(m => ({ default: m.CreateMaintenanceModal })));
const MaintenanceDetailsModal = dynamic(() => import("@/components/modals/maintenance-details-modal").then(m => ({ default: m.MaintenanceDetailsModal })));
const AcquisitionModal = dynamic(() => import("@/components/modals/acquisition-modal").then(m => ({ default: m.AcquisitionModal })));

export default function WorkOrdersPage() {
    const { data: assets = [] } = useAssets();
    
    // Get glassmorphism setting from context
    const { enableGlassmorphism } = useMaintenanceContext();
    const cardClassName = enableGlassmorphism 
        ? "border border-white/20 bg-white/10 dark:bg-black/10 backdrop-blur-xl ring-1 ring-white/10" 
        : "";

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

    const handleRequestReplacement = (assetId: string) => {
        const asset = assets.find(a => a.id === assetId);
        if (asset) {
            setSelectedAssetForReplacement(asset);
            setIsAcquisitionModalOpen(true);
        }
    };

    return (
        <div className="space-y-12 pb-10">
            <section>
                <MaintenanceOperations
                    onCreateRequest={handleCreateRequest}
                    onRecordClick={handleRecordClick}
                    cardClassName={cardClassName}
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
                key={selectedAssetForReplacement ? `acquisition-${selectedAssetForReplacement.id}` : "acquisition"}
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
