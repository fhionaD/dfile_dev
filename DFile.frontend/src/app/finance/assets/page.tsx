"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Asset } from "@/types/asset";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { AddAssetModal } from "@/components/modals/add-asset-modal";
import { useAddAsset, useAssets, useUpdateAsset } from "@/hooks/use-assets";
import { useCategories } from "@/hooks/use-categories";

const AssetStats = dynamic(() => import("@/components/asset-stats").then(m => ({ default: m.AssetStats })), {
    loading: () => (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
                <Card key={i} className="p-6"><Skeleton className="h-20 w-full" /></Card>
            ))}
        </div>
    ),
});
const AssetTable = dynamic(() => import("@/components/asset-table").then(m => ({ default: m.AssetTable })), {
    loading: () => <Card className="p-6"><Skeleton className="h-[400px] w-full" /></Card>,
});
const AssetDetailsModal = dynamic(() => import("@/components/modals/asset-details-modal").then(m => ({ default: m.AssetDetailsModal })));

export default function FinanceAssetsPage() {
    const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);

    const { data: assetCategories = [] } = useCategories(false);
    const { data: assets = [] } = useAssets(false);
    const addAssetMutation = useAddAsset();
    const updateAssetMutation = useUpdateAsset();

    const activeCategories = assetCategories.filter(c => c.status !== "Archived");
    const existingSerialNumbers = assets
        .map(a => (a.serialNumber ?? "").trim())
        .filter((s): s is string => s.length > 0);

    return (
        <>
            <div className="space-y-8">
                <AssetStats />
                <AssetTable
                    onAssetClick={(asset) => {
                        setSelectedAsset(asset);
                        setIsDetailsModalOpen(true);
                    }}
                    onRegisterAsset={() => {
                        setSelectedAsset(null);
                        setIsEditMode(false);
                        setIsAddModalOpen(true);
                    }}
                />
            </div>

            <AssetDetailsModal
                open={isDetailsModalOpen}
                onOpenChange={setIsDetailsModalOpen}
                asset={selectedAsset}
                onEdit={(asset) => {
                    setIsDetailsModalOpen(false);
                    setSelectedAsset(asset);
                    setIsEditMode(true);
                    setIsAddModalOpen(true);
                }}
            />

            <AddAssetModal
                open={isAddModalOpen}
                onOpenChange={(open) => {
                    if (!open) {
                        setIsEditMode(false);
                        setSelectedAsset(null);
                    }
                    setIsAddModalOpen(open);
                }}
                categories={activeCategories}
                existingSerialNumbers={existingSerialNumbers}
                mode={isEditMode ? "edit" : "create"}
                initialData={isEditMode && selectedAsset ? selectedAsset : undefined}
                onAddAsset={async (asset) => {
                    const asNullableDate = (v?: string) => (v && v.trim() ? v : null);
                    const payload: Record<string, unknown> = {
                        assetName: asset.desc?.trim() || "",
                        categoryId: asset.categoryId,
                        lifecycleStatus: asset.lifecycleStatus ?? 0,
                        currentCondition: asset.currentCondition ?? 0,
                        image: asset.image || null,
                        manufacturer: asset.manufacturer || null,
                        model: asset.model || null,
                        serialNumber: asset.serialNumber || null,
                        purchaseDate: asNullableDate(asset.purchaseDate),
                        vendor: asset.vendor || null,
                        acquisitionCost: Number(asset.purchasePrice ?? 0),
                        usefulLifeYears: Number(asset.usefulLifeYears ?? 0),
                        purchasePrice: Number(asset.purchasePrice ?? 0),
                        residualValue: null,
                        currentBookValue: Number(asset.currentBookValue ?? asset.purchasePrice ?? 0),
                        monthlyDepreciation: Number(asset.monthlyDepreciation ?? 0),
                        warrantyExpiry: asNullableDate(asset.warrantyExpiry),
                        notes: asset.notes || null,
                        documents: asset.documents || null,
                        rowVersion: asset.rowVersion || null,
                    };
                    if (isEditMode && selectedAsset) {
                        await updateAssetMutation.mutateAsync({ id: selectedAsset.id, payload: payload as never });
                    } else {
                        await addAssetMutation.mutateAsync(payload as never);
                    }
                    setIsAddModalOpen(false);
                    setIsEditMode(false);
                    setSelectedAsset(null);
                }}
            />
        </>
    );
}
