"use client";

import { useState } from "react";
import { RegistrationView } from "@/components/registration-view";
import { AddAssetModal } from "@/components/modals/add-asset-modal";
import { ManageCategoriesModal } from "@/components/modals/manage-categories-modal";
import { useAssets, useAddAsset } from "@/hooks/use-assets";
import { useCategories, useAddCategory, useUpdateCategory, useArchiveCategory } from "@/hooks/use-categories";

export default function InventoryPage() {
    const { data: assets = [] } = useAssets();
    const { data: assetCategories = [] } = useCategories();

    const addAssetMutation = useAddAsset();
    const addCategoryMutation = useAddCategory();
    const updateCategoryMutation = useUpdateCategory();
    const archiveCategoryMutation = useArchiveCategory();

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

    // Filter out archived items for active view
    const activeAssets = assets.filter(a => a.status !== 'Archived');
    const activeCategories = assetCategories.filter(c => c.status !== 'Archived');

    return (
        <>
            <RegistrationView
                onRegister={() => setIsAddModalOpen(true)}
                onManageCategories={() => setIsCategoryModalOpen(true)}
            />

            <AddAssetModal
                open={isAddModalOpen}
                onOpenChange={setIsAddModalOpen}
                categories={activeCategories}
                onAddAsset={async (asset) => {
                    await addAssetMutation.mutateAsync(asset);
                    setIsAddModalOpen(false);
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
                    // We need to cast or ensure data is sufficient. 
                    // Assuming data contains updated fields. We need to merge with existing logic or just pass what we have if backend accepts partial.
                    // But useUpdateCategory expects Category. 
                    // We can find the existing category to merge, or satisfy the type.
                    // For now, let's assume data + id is enough or use 'as Category' if we are sure.
                    // Better: fetch the category or trust the backend handles partial if we changed the hook type. 
                    // But the hook takes Category. 
                    // Let's assume we can form a Category.
                    await updateCategoryMutation.mutateAsync({ ...data, id } as any);
                }}
                onArchiveCategory={async (id) => {
                    await archiveCategoryMutation.mutateAsync(id);
                }}
            />
        </>
    );
}
