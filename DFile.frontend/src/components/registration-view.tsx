"use client";

import { useMemo, useCallback, useState, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Asset } from "@/types/asset";
import { useAssets, useAddAsset, useUpdateAsset } from "@/hooks/use-assets";
import { useCategories } from "@/hooks/use-categories";
import { AddAssetModal } from "@/components/modals/add-asset-modal";
import { AssetDetailsModal } from "@/components/modals/asset-details-modal";

import { AssetStats } from "@/components/asset-stats";
import { AssetTable } from "@/components/asset-table";
import { AssetCategoriesSection } from "@/components/asset-categories-section";

interface RegistrationViewProps {
    /** @deprecated Registration is handled inside this component; kept for compatibility if passed. */
    onRegister?: () => void;
    /** @deprecated Use internal asset details; kept for compatibility if passed. */
    onAssetClick?: (asset: Asset) => void;
}

export function RegistrationView({ onRegister, onAssetClick }: RegistrationViewProps) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const router = useRouter();

    const tabFromUrl = searchParams.get("tab") === "categories" ? "categories" : "inventory";
    const [activeTab, setActiveTab] = useState<"inventory" | "categories">(tabFromUrl);

    useEffect(() => {
        setActiveTab(tabFromUrl);
    }, [tabFromUrl]);

    const setActiveTabHandler = useCallback(
        (v: string) => {
            const next = v === "categories" ? "categories" : "inventory";
            setActiveTab(next);
            const p = new URLSearchParams(searchParams.toString());
            if (next === "inventory") p.delete("tab");
            else p.set("tab", "categories");
            const qs = p.toString();
            router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
        },
        [pathname, router, searchParams],
    );

    const { data: assetsForSerial = [] } = useAssets(false);
    const { data: activeCategoriesRaw = [] } = useCategories(false);
    const addAssetMutation = useAddAsset();
    const updateAssetMutation = useUpdateAsset();

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

    const activeCategories = useMemo(
        () => activeCategoriesRaw.filter((c) => c.status !== "Archived"),
        [activeCategoriesRaw],
    );
    const existingSerialNumbers = useMemo(
        () =>
            assetsForSerial
                .map((a) => (a.serialNumber ?? "").trim())
                .filter((s): s is string => s.length > 0),
        [assetsForSerial],
    );

    const openRegisterAsset = useCallback(() => {
        setIsEditMode(false);
        setSelectedAsset(null);
        setIsAddModalOpen(true);
        onRegister?.();
    }, [onRegister]);

    const handleInventoryAssetClick = useCallback(
        (asset: Asset) => {
            setSelectedAsset(asset);
            setIsDetailsOpen(true);
            onAssetClick?.(asset);
        },
        [onAssetClick],
    );

    return (
        <div className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTabHandler} className="w-full">
                <div className="mb-8 space-y-4">
                    <TabsList className="grid h-11 w-full max-w-[400px] grid-cols-2">
                        <TabsTrigger value="inventory" className="text-sm">
                            Inventory List
                        </TabsTrigger>
                        <TabsTrigger value="categories" className="text-sm">
                            Asset Categories
                        </TabsTrigger>
                    </TabsList>
                </div>

                {activeTab === "inventory" ? (
                    <div className="space-y-8">
                        <AssetStats />
                        <AssetTable
                            onAssetClick={handleInventoryAssetClick}
                            onRegisterAsset={openRegisterAsset}
                        />
                    </div>
                ) : (
                    <AssetCategoriesSection />
                )}
            </Tabs>

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
                        salvagePercentage:
                            asset.isSalvageOverride === true ? asset.salvagePercentage ?? null : null,
                        isSalvageOverride: asset.isSalvageOverride ?? false,
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
        </div>
    );
}
