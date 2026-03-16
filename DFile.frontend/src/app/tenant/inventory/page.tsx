"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RegistrationView } from "@/components/registration-view";
import { AddAssetModal } from "@/components/modals/add-asset-modal";
import { AssetDetailsModal } from "@/components/modals/asset-details-modal";
import { useAddAsset, useUpdateAsset } from "@/hooks/use-assets";
import { useCategories } from "@/hooks/use-categories";
import { Asset } from "@/types/asset";

export default function InventoryPage() {
    const router = useRouter();
    const { data: assetCategories = [] } = useCategories(false);

    const addAssetMutation = useAddAsset();
    const updateAssetMutation = useUpdateAsset();

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);

    const activeCategories = assetCategories.filter(c => c.status !== 'Archived');

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
                mode={isEditMode ? "edit" : "create"}
                initialData={isEditMode && selectedAsset ? selectedAsset : undefined}
                onAddAsset={async (asset) => {
                    if (isEditMode && selectedAsset) {
                        await updateAssetMutation.mutateAsync({ id: selectedAsset.id, payload: asset });
                    } else {
                        await addAssetMutation.mutateAsync(asset);
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
