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
import { FinanceDashboard } from "@/components/finance-dashboard";
import { AcquisitionModal } from "@/components/modals/acquisition-modal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PieChart, TrendingDown, FileBadge } from "lucide-react";

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
    if (user.mustChangePassword) return null; // Guard against leaked API calls before layout redirect

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
        content = <FinanceDashboard />;
    } else if (user.role === 'Admin' || user.role === 'Tenant Admin' || user.role === 'Super Admin') {
        // Admin & Super Admin View (Stats + Table)
        content = (
            <div className="space-y-6">
                <AssetStats />
                <AssetTable
                    onAssetClick={handleAssetClick}
                />
            </div>
        );
    } else {
        // Employee / Default View (Restricted)
        content = (
            <div className="p-8 text-center space-y-4">
                <div className="inline-flex p-4 rounded-full bg-muted">
                    <PieChart className="h-8 w-8 text-muted-foreground" />
                </div>
                <h2 className="text-xl font-semibold">Node Connected</h2>
                <p className="text-muted-foreground max-w-sm mx-auto">
                    Welcome to the DFile Asset Management System. Your account is active, but you do not have administrative permissions for this dashboard.
                </p>
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
