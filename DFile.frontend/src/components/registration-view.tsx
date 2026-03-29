"use client";

import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tag, Search, Archive, RotateCcw, Filter, Plus } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TablePagination, paginateData } from "@/components/ui/table-pagination";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

import { Asset, Category } from "@/types/asset";
import { useAssets, useAddAsset, useUpdateAsset } from "@/hooks/use-assets";
import { useCategories, useAddCategory, useArchiveCategory, useRestoreCategory } from "@/hooks/use-categories";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EditCategoryModal } from "@/components/modals/edit-category-modal";
import { CategoryDetailsModal } from "@/components/modals/category-details-modal";
import { AddAssetModal } from "@/components/modals/add-asset-modal";
import { AssetDetailsModal } from "@/components/modals/asset-details-modal";

import { AssetStats } from "@/components/asset-stats";
import { AssetTable } from "@/components/asset-table";

interface RegistrationViewProps {
    /** @deprecated Registration is handled inside this component; kept for compatibility if passed. */
    onRegister?: () => void;
    /** @deprecated Use internal asset details; kept for compatibility if passed. */
    onAssetClick?: (asset: Asset) => void;
}

const handlingLabels: Record<number, string> = { 0: "Fixed", 1: "Consumable", 2: "Movable" };
const handlingTextColors: Record<number, string> = {
    0: "text-blue-700 dark:text-blue-400",
    1: "text-amber-700 dark:text-amber-400",
    2: "text-emerald-700 dark:text-emerald-400",
};

export function RegistrationView({ onRegister, onAssetClick }: RegistrationViewProps) {
    const [activeTab, setActiveTab] = useState<string>("inventory");

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

    // ── Category state ──
    const [showArchived, setShowArchived] = useState(false);
    const { data: categories = [], isLoading: isCategoriesLoading } = useCategories(showArchived);
    const { data: countOpposite = [] } = useCategories(!showArchived);
    const archivedCount = showArchived ? categories.length : countOpposite.length;
    const activeCount = showArchived ? countOpposite.length : categories.length;
    const addMutation = useAddCategory();
    const archiveMutation = useArchiveCategory();
    const restoreMutation = useRestoreCategory();

    const [searchQuery, setSearchQuery] = useState("");
    const [handlingTypeFilter, setHandlingTypeFilter] = useState("All");
    const [archiveTarget, setArchiveTarget] = useState<string | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [form, setForm] = useState({ categoryName: "", description: "", handlingType: 0, salvagePercentage: "10" });
    const [pageIndex, setPageIndex] = useState(0);
    const [pageSize, setPageSize] = useState(10);

    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const filtered = useMemo(() => {
        return categories.filter(c => {
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                if (!c.categoryName.toLowerCase().includes(q) && !c.description.toLowerCase().includes(q)) return false;
            }
            if (handlingTypeFilter !== "All" && (handlingLabels[c.handlingType] ?? "Unknown") !== handlingTypeFilter) return false;
            return true;
        });
    }, [categories, searchQuery, handlingTypeFilter]);

    const openCreate = () => {
        setForm({ categoryName: "", description: "", handlingType: 0, salvagePercentage: "10" });
        setIsFormOpen(true);
    };

    const handleSave = async () => {
        if (!form.categoryName.trim()) { toast.error("Category name is required"); return; }
        const pct = Number(form.salvagePercentage);
        if (isNaN(pct) || pct < 0 || pct > 100) { toast.error("Salvage percentage must be between 0 and 100"); return; }
        try {
            await addMutation.mutateAsync({ ...form, salvagePercentage: pct });
            toast.success("Category created");
            setIsFormOpen(false);
        } catch {
            // handled by mutation onError
        }
    };

    const openDetailModal = (category: Category) => {
        setSelectedCategory(category);
        setIsDetailModalOpen(true);
    };

    const openEditModal = (category: Category) => {
        setIsDetailModalOpen(false);
        setSelectedCategory(category);
        setIsEditModalOpen(true);
    };

    return (
        <div className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="mb-8 space-y-4">
                    <TabsList className="grid w-full max-w-[400px] grid-cols-2 h-11">
                        <TabsTrigger value="inventory" className="text-sm">
                            Inventory List
                        </TabsTrigger>
                        <TabsTrigger value="categories" className="text-sm">
                            Asset Categories
                        </TabsTrigger>
                    </TabsList>
                    {activeTab === "categories" && (
                        <div className="flex justify-end">
                            <Button type="button" onClick={openCreate} className="gap-2 h-10">
                                <Plus className="h-4 w-4" /> Add Category
                            </Button>
                        </div>
                    )}
                </div>

                {activeTab === "inventory" ? (
                    <div className="space-y-8">
                        <AssetStats />
                        <AssetTable onAssetClick={handleInventoryAssetClick} onRegisterAsset={openRegisterAsset} />
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                                <Tag className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-xl font-semibold tracking-tight">Asset Categories</h1>
                                <p className="text-sm text-muted-foreground">Define and manage asset classification categories</p>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                                <h2 className="text-lg font-semibold">{showArchived ? "Archived Categories" : "Asset Categories"}</h2>
                                <span className="text-sm text-muted-foreground">({filtered.length})</span>
                            </div>
                            <div className="flex gap-2">
                                <div className="relative flex-1 sm:w-64">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input placeholder="Search categories..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 h-10" />
                                </div>
                                <Select value={handlingTypeFilter} onValueChange={setHandlingTypeFilter}>
                                    <SelectTrigger className="w-[150px] h-10">
                                        <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                                        <SelectValue placeholder="Handling" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="All">All Types</SelectItem>
                                        <SelectItem value="Fixed">Fixed</SelectItem>
                                        <SelectItem value="Consumable">Consumable</SelectItem>
                                        <SelectItem value="Movable">Movable</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Button variant={showArchived ? "default" : "outline"} className="h-10" onClick={() => setShowArchived(!showArchived)}>
                                    {showArchived ? (
                                        <><RotateCcw className="h-4 w-4 mr-2" />Active ({activeCount})</>
                                    ) : (
                                        <><Archive className="h-4 w-4 mr-2" />Archived ({archivedCount})</>
                                    )}
                                </Button>
                            </div>
                        </div>

                        {isCategoriesLoading ? (
                            <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
                        ) : filtered.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground rounded-md border min-h-[520px] flex flex-col items-center justify-center">
                                <Tag className="h-12 w-12 mx-auto mb-4 opacity-20" />
                                <p>{showArchived ? "No archived categories" : "No categories found"}</p>
                            </div>
                        ) : (
                            <div className="rounded-md border overflow-auto min-h-[520px]">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Description</TableHead>
                                            <TableHead>Handling Type</TableHead>
                                            <TableHead>Assets</TableHead>
                                            <TableHead>Last Updated</TableHead>
                                            <TableHead className="w-[80px] text-center">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {paginateData(filtered, pageIndex, pageSize).map(c => (
                                            <TableRow key={c.id} className="cursor-pointer" onClick={() => openDetailModal(c)}>
                                                <TableCell className="font-medium">{c.categoryName}</TableCell>
                                                <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{c.description}</TableCell>
                                                <TableCell>
                                                    <span className={`text-xs font-semibold ${handlingTextColors[c.handlingType] ?? "text-foreground"}`}>
                                                        {handlingLabels[c.handlingType] ?? "Unknown"}
                                                    </span>
                                                </TableCell>
                                                <TableCell>{c.assetCount}</TableCell>
                                                <TableCell className="text-sm text-muted-foreground">{c.updatedAt ? new Date(c.updatedAt).toLocaleDateString() : "—"}</TableCell>
                                                <TableCell className="text-center">
                                                    <div className="flex items-center justify-center gap-1">
                                                        {!c.isArchived ? (
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" title="Archive" onClick={(e) => { e.stopPropagation(); setArchiveTarget(c.id); }}>
                                                                <Archive className="h-4 w-4" />
                                                            </Button>
                                                        ) : (
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600 hover:bg-emerald-500/10" title="Restore" onClick={(e) => { e.stopPropagation(); restoreMutation.mutateAsync(c.id); }}>
                                                                <RotateCcw className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                <TablePagination
                                    totalItems={filtered.length}
                                    pageSize={pageSize}
                                    pageIndex={pageIndex}
                                    onPageChange={setPageIndex}
                                    onPageSizeChange={setPageSize}
                                />
                            </div>
                        )}
                    </div>
                )}
            </Tabs>

            {/* ── Category Create Dialog ── */}
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create Category</DialogTitle>
                        <DialogDescription>Fill in the details to create a new asset category.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Category Name</Label>
                            <Input value={form.categoryName} onChange={(e) => setForm(f => ({ ...f, categoryName: e.target.value }))} placeholder="e.g. IT Equipment" />
                        </div>
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Input value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Category description" />
                        </div>
                        <div className="space-y-2">
                            <Label>Handling Type</Label>
                            <Select value={String(form.handlingType)} onValueChange={(v) => setForm(f => ({ ...f, handlingType: Number(v) }))}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="0">Fixed</SelectItem>
                                    <SelectItem value="1">Consumable</SelectItem>
                                    <SelectItem value="2">Movable</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Default Salvage Value (%)</Label>
                            <Input
                                type="number"
                                min={0}
                                max={100}
                                step={0.01}
                                value={form.salvagePercentage}
                                onChange={(e) => setForm(f => ({ ...f, salvagePercentage: e.target.value }))}
                                onBlur={() => {
                                    const n = Number(form.salvagePercentage);
                                    if (form.salvagePercentage === "" || isNaN(n)) return;
                                    setForm(f => ({ ...f, salvagePercentage: String(Math.min(100, Math.max(0, n))) }));
                                }}
                                placeholder="e.g. 10"
                            />
                            <p className="text-xs text-muted-foreground">Applied as default salvage percentage when registering assets in this category</p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button>
                        <Button onClick={handleSave} disabled={addMutation.isPending}>Create</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={archiveTarget !== null}
                onOpenChange={(open) => { if (!open) setArchiveTarget(null); }}
                title="Archive Category"
                description="Are you sure you want to archive this category? It can be restored later from the archive view."
                confirmLabel="Archive"
                confirmVariant="destructive"
                onConfirm={async () => {
                    if (archiveTarget) {
                        await archiveMutation.mutateAsync(archiveTarget);
                        setArchiveTarget(null);
                    }
                }}
                isLoading={archiveMutation.isPending}
            />

            <CategoryDetailsModal
                open={isDetailModalOpen}
                onOpenChange={setIsDetailModalOpen}
                category={selectedCategory}
                onEdit={openEditModal}
            />

            <EditCategoryModal
                open={isEditModalOpen}
                onOpenChange={setIsEditModalOpen}
                category={selectedCategory}
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
                        salvagePercentage: asset.salvagePercentage ?? null,
                        isSalvageOverride: asset.isSalvageOverride ?? false,
                        currentBookValue: Number(asset.currentBookValue ?? asset.purchasePrice ?? 0),
                        monthlyDepreciation: Number(asset.monthlyDepreciation ?? 0),
                        warrantyExpiry: asNullableDate(asset.warrantyExpiry),
                        notes: asset.notes || null,
                        documents: asset.documents || null,
                        rowVersion: asset.rowVersion || null,
                        tagNumber: asset.tagNumber || asset.assetCode || asset.id || `AST-${Date.now()}`,
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
