"use client";

import { useState } from "react";
import { RegistrationView } from "@/components/registration-view";
import { AddAssetModal } from "@/components/modals/add-asset-modal";
import { ManageCategoriesModal } from "@/components/modals/manage-categories-modal";
import { useData } from "@/contexts/data-context";

export default function InventoryPage() {
    const {
        assets,
        assetCategories,
        addAsset,
        addAssetCategory,
        updateAssetCategory,
        archiveAssetCategory
    } = useData();

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

    // Filter out archived items for active view
    const activeAssets = assets.filter(a => a.status !== 'Archived');
    const activeCategories = assetCategories.filter(c => c.status !== 'Archived');

    return (
        <>
            <RegistrationView
                assets={activeAssets}
                categories={activeCategories}
                onRegister={() => setIsAddModalOpen(true)}
                onManageCategories={() => setIsCategoryModalOpen(true)}
            />

            <AddAssetModal
                open={isAddModalOpen}
                onOpenChange={setIsAddModalOpen}
                categories={activeCategories}
                onAddAsset={(asset) => {
                    addAsset(asset);
                    setIsAddModalOpen(false);
                }}
            />

            <ManageCategoriesModal
                open={isCategoryModalOpen}
                onOpenChange={setIsCategoryModalOpen}
                categories={assetCategories}
                onAddCategory={addAssetCategory}
                onUpdateCategory={updateAssetCategory}
                onArchiveCategory={archiveAssetCategory}
            />
        </>
    );
}
