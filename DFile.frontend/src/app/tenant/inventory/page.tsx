"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RegistrationView } from "@/components/registration-view";
import { AddAssetModal } from "@/components/modals/add-asset-modal";
import { AssetDetailsModal } from "@/components/modals/asset-details-modal";
import { useAddAsset, useAssets, useUpdateAsset } from "@/hooks/use-assets";
import { useCategories } from "@/hooks/use-categories";
import { Asset } from "@/types/asset";

export default function InventoryPage() {
    const router = useRouter();
    const { data: assetCategories = [] } = useCategories(false);
    const { data: assets = [] } = useAssets(false);

    const addAssetMutation = useAddAsset();
    const updateAssetMutation = useUpdateAsset();

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);

    const activeCategories = assetCategories.filter(c => c.status !== 'Archived');
    const existingSerialNumbers = assets
        .map(a => (a.serialNumber ?? "").trim())
        .filter((s): s is string => s.length > 0);

    return (
        <>
            <RegistrationView
                onRegister={() => {
                    setIsEditMode(false);
                    setSelectedAsset(null);
                    setIsAddModalOpen(true);
                }}
                onManageCategories={() => router.push("/tenant/asset-categories")}
                onAssetClick={(asset) => {
                    setSelectedAsset(asset);
                    setIsDetailsOpen(true);
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
                    const payload: any = {
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
                        tagNumber: asset.tagNumber || asset.assetCode || asset.id || `AST-${Date.now()}`,
                    };
                    if (isEditMode && selectedAsset) {
                        await updateAssetMutation.mutateAsync({ id: selectedAsset.id, payload: payload as any });
                    } else {
                        await addAssetMutation.mutateAsync(payload as any);
                    }
                    setIsAddModalOpen(false);
                    setIsEditMode(false);
                    setSelectedAsset(null);
                }}
            />

            <AssetDetailsModal
                open={isDetailsOpen}
                onOpenChange={setIsDetailsOpen}
                asset={selectedAsset}
                onEdit={(asset) => {
                    setIsDetailsOpen(false);
                    setSelectedAsset(asset);
                    setIsEditMode(true);
                    setIsAddModalOpen(true);
                }}
            />
        </>
    );
}
