"use client";

import { useState } from "react";
import { RegistrationView } from "@/components/registration-view";
import { AddAssetModal } from "@/components/modals/add-asset-modal";
import { ManageCategoriesModal } from "@/components/modals/manage-categories-modal";
import { AssetDetailsModal } from "@/components/modals/asset-details-modal";
import { useAssets, useAddAsset, useUpdateAsset } from "@/hooks/use-assets";
import { useCategories, useAddCategory, useUpdateCategory, useArchiveCategory, useRestoreCategory } from "@/hooks/use-categories";
import { Asset } from "@/types/asset";

export default function InventoryPage() {
    const { data: assets = [] } = useAssets();
    const { data: assetCategories = [] } = useCategories(true);

    const addAssetMutation = useAddAsset();
    const updateAssetMutation = useUpdateAsset();
    const addCategoryMutation = useAddCategory();
    const updateCategoryMutation = useUpdateCategory();
    const archiveCategoryMutation = useArchiveCategory();
    const restoreCategoryMutation = useRestoreCategory();

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);

    // Filter out archived items for active view
    const activeAssets = assets.filter(a => a.status !== 'Archived');
    const activeCategories = assetCategories.filter(c => c.status !== 'Archived');

    return (
        <>
            <RegistrationView
                onRegister={() => {
                    setIsEditMode(false);
                    setSelectedAsset(null);
                    setIsAddModalOpen(true);
                }}
                onManageCategories={() => setIsCategoryModalOpen(true)}
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
                mode={isEditMode ? "edit" : "create"}
                initialData={isEditMode && selectedAsset ? selectedAsset : undefined}
                onAddAsset={async (asset) => {
                    try {
                        if (isEditMode) {
                            await updateAssetMutation.mutateAsync(asset);
                        } else {
                            await addAssetMutation.mutateAsync(asset);
                        }
                        setIsAddModalOpen(false);
                        setIsEditMode(false);
                        setSelectedAsset(null);
                    } catch (error) {
                        console.error("Operation failed", error);
                    }
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

            <ManageCategoriesModal
                open={isCategoryModalOpen}
                onOpenChange={setIsCategoryModalOpen}
                categories={assetCategories}
                onAddCategory={async (category) => {
                    await addCategoryMutation.mutateAsync({
                        ...category,
                        items: 0,
                        status: "Active"
                    });
                }}
                onUpdateCategory={async (id, data) => {
                    // Updating category usually
                    await updateCategoryMutation.mutateAsync({ ...data, id } as any);
                }}
                onArchiveCategory={async (id) => {
                    const category = assetCategories.find(c => c.id === id);
                    if (category && category.status === 'Archived') {
                        await restoreCategoryMutation.mutateAsync(id);
                    } else {
                        await archiveCategoryMutation.mutateAsync(id);
                    }
                }}
            />
        </>
    );
}
