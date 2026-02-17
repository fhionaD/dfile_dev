"use client";

import { useState } from "react";
import { AssetStats } from "@/components/asset-stats";
import { AssetTable } from "@/components/asset-table";
import { AssetDetailsModal } from "@/components/modals/asset-details-modal";
import { useAuth } from "@/contexts/auth-context";
import { Asset } from "@/types/asset";
import { MaintenanceView } from "@/components/maintenance-view";
import { ProcurementView } from "@/components/procurement-view";
import { DepreciationView } from "@/components/depreciation-view";
import { CreateMaintenanceModal } from "@/components/modals/create-maintenance-modal";
import { AcquisitionModal } from "@/components/modals/acquisition-modal";

export default function DashboardPage() {
    const { user } = useAuth();

    // UI State
    const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [isCreateMaintenanceOpen, setIsCreateMaintenanceOpen] = useState(false);
    const [isCreateOrderOpen, setIsCreateOrderOpen] = useState(false);

    const handleAssetClick = (asset: Asset) => {
        setSelectedAsset(asset);
        setIsDetailsModalOpen(true);
    };

    if (!user) return null;

    let content;

    if (user.role === 'Maintenance') {
        content = (
            <MaintenanceView />
        );
    } else if (user.role === 'Procurement') {
        content = (
            <ProcurementView
                onNewOrder={() => setIsCreateOrderOpen(true)}
            />
        );
    } else if (user.role === 'Finance') {
        content = <DepreciationView />;
    } else {
        // Admin & Super Admin View (Stats + Table)
        content = (
            <div className="space-y-6">
                <AssetStats />
                <AssetTable
                    onAssetClick={handleAssetClick}
                />
            </div>
        );
    }

    return (
        <>
            {content}


            <AcquisitionModal
                open={isCreateOrderOpen}
                onOpenChange={setIsCreateOrderOpen}
            />

            <AssetDetailsModal
                open={isDetailsModalOpen}
                onOpenChange={setIsDetailsModalOpen}
                asset={selectedAsset}
            />
        </>
    );
}
