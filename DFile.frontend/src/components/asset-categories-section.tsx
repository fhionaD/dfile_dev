"use client";

import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tag, Plus, Archive, RotateCcw, Filter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    ArchiveViewToggleButton,
    DataTablePrimaryButton,
    DataTableSearch,
    DataTableToolbar,
    dataTableFilterTriggerClass,
} from "@/components/data-table/data-table-toolbar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TablePagination, paginateData } from "@/components/ui/table-pagination";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Category } from "@/types/asset";
import { useCategories, useAddCategory, useArchiveCategory, useRestoreCategory } from "@/hooks/use-categories";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EditCategoryModal } from "@/components/modals/edit-category-modal";
import { CategoryDetailsModal } from "@/components/modals/category-details-modal";

const handlingLabels: Record<number, string> = { 0: "Fixed", 1: "Consumable", 2: "Movable" };
const handlingTextColors: Record<number, string> = {
    0: "text-blue-700 dark:text-blue-400",
    1: "text-amber-700 dark:text-amber-400",
    2: "text-emerald-700 dark:text-emerald-400",
};

/**
 * Shared Asset Categories UI (toolbar + table + modals).
 * Used by Registration & Tagging → Asset Categories tab (URL: /tenant/inventory?tab=categories).
 */
export function AssetCategoriesSection() {
    const [showArchived, setShowArchived] = useState(false);
    const { data: categoriesActive = [], isLoading: loadingActive } = useCategories(false);
    const { data: categoriesArchived = [], isLoading: loadingArchived } = useCategories(true);
    const categories = showArchived ? categoriesArchived : categoriesActive;
    const isLoading = loadingActive || loadingArchived;
    const addMutation = useAddCategory();
    const archiveMutation = useArchiveCategory();
    const restoreMutation = useRestoreCategory();

    const [searchQuery, setSearchQuery] = useState("");
    const [handlingTypeFilter, setHandlingTypeFilter] = useState("All");
    const [archiveTarget, setArchiveTarget] = useState<string | null>(null);
    const [restoreTarget, setRestoreTarget] = useState<string | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [form, setForm] = useState({ categoryName: "", description: "", handlingType: 0, salvagePercentage: "10" });
    const [pageIndex, setPageIndex] = useState(0);
    const [pageSize, setPageSize] = useState(10);

    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const handleSearchQueryChange = useCallback((v: string) => {
        setPageIndex(0);
        setSearchQuery(v);
    }, []);

    const handleHandlingTypeFilterChange = useCallback((v: string) => {
        setPageIndex(0);
        setHandlingTypeFilter(v);
    }, []);

    const toggleShowArchived = useCallback(() => {
        setPageIndex(0);
        setShowArchived((prev) => !prev);
    }, []);

    const filtered = useMemo(() => {
        return categories.filter((c) => {
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const name = (c.categoryName ?? "").toLowerCase();
                const desc = (c.description ?? "").toLowerCase();
                if (!name.includes(q) && !desc.includes(q)) return false;
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
        if (!form.categoryName.trim()) {
            toast.error("Category name is required");
            return;
        }
        const pct = Number(form.salvagePercentage);
        if (isNaN(pct) || pct < 0 || pct > 100) {
            toast.error("Salvage percentage must be between 0 and 100");
            return;
        }
        try {
            await addMutation.mutateAsync({ ...form, salvagePercentage: pct });
            toast.success("Category created");
            setIsFormOpen(false);
        } catch {
            /* onError on mutation */
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
        <>
            <div className="overflow-hidden rounded-md border">
                <TooltipProvider delayDuration={300}>
                    <DataTableToolbar
                        left={
                            <>
                                <DataTableSearch
                                    value={searchQuery}
                                    onChange={handleSearchQueryChange}
                                    placeholder="Search categories..."
                                    ariaLabel="Search categories"
                                />
                                <Select value={handlingTypeFilter} onValueChange={handleHandlingTypeFilterChange}>
                                    <SelectTrigger className={dataTableFilterTriggerClass}>
                                        <Filter className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                                        <SelectValue placeholder="Handling" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="All">All Types</SelectItem>
                                        <SelectItem value="Fixed">Fixed</SelectItem>
                                        <SelectItem value="Consumable">Consumable</SelectItem>
                                        <SelectItem value="Movable">Movable</SelectItem>
                                    </SelectContent>
                                </Select>
                            </>
                        }
                        right={
                            <>
                                <DataTablePrimaryButton onClick={openCreate}>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add Category
                                </DataTablePrimaryButton>
                                <ArchiveViewToggleButton
                                    showArchived={showArchived}
                                    onToggle={toggleShowArchived}
                                    activeCount={categoriesActive.length}
                                    archivedCount={categoriesArchived.length}
                                />
                            </>
                        }
                    />

                    {isLoading ? (
                        <div className="space-y-3 p-6">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
                    ) : filtered.length === 0 ? (
                        <div className="flex min-h-[520px] flex-col items-center justify-center py-12 text-center text-muted-foreground">
                            <Tag className="mx-auto mb-4 h-12 w-12 opacity-20" />
                            <p>{showArchived ? "No archived categories" : "No categories found"}</p>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <Table className="w-full table-fixed">
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[18%]">Name</TableHead>
                                            <TableHead className="w-[28%]">Description</TableHead>
                                            <TableHead className="w-[14%]">Handling Type</TableHead>
                                            <TableHead className="w-[10%]">Assets</TableHead>
                                            <TableHead className="w-[14%]">Last Updated</TableHead>
                                            <TableHead className="w-[120px] text-center">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {paginateData(filtered, pageIndex, pageSize).map((c) => {
                                            const registeredCount = Number(c.assetCount ?? c.items ?? 0);
                                            const blockArchive = !c.isArchived && registeredCount > 0;
                                            return (
                                                <TableRow key={c.id} className="cursor-pointer" onClick={() => openDetailModal(c)}>
                                                    <TableCell className="max-w-0 font-medium">
                                                        <span className="block truncate">{c.categoryName}</span>
                                                    </TableCell>
                                                    <TableCell className="max-w-0 text-sm text-muted-foreground">
                                                        <span className="block truncate">{c.description}</span>
                                                    </TableCell>
                                                    <TableCell className="max-w-0">
                                                        <span
                                                            className={`block truncate text-xs font-semibold ${handlingTextColors[c.handlingType] ?? "text-foreground"}`}
                                                        >
                                                            {handlingLabels[c.handlingType] ?? "Unknown"}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell>{registeredCount}</TableCell>
                                                    <TableCell className="max-w-0 text-sm text-muted-foreground">
                                                        <span className="block truncate">
                                                            {c.updatedAt ? new Date(c.updatedAt).toLocaleDateString() : "—"}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="w-[120px] text-center">
                                                        <div className="flex items-center justify-center gap-1">
                                                            {!c.isArchived ? (
                                                                blockArchive ? (
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <span className="inline-flex" onClick={(e) => e.stopPropagation()}>
                                                                                <Button
                                                                                    variant="ghost"
                                                                                    size="icon"
                                                                                    className="h-8 w-8 text-muted-foreground"
                                                                                    disabled
                                                                                    aria-label="Cannot archive category with registered assets"
                                                                                >
                                                                                    <Archive className="h-4 w-4" />
                                                                                </Button>
                                                                            </span>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent side="left">Cannot archive category with registered assets</TooltipContent>
                                                                    </Tooltip>
                                                                ) : (
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                                                        title="Archive"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setArchiveTarget(c.id);
                                                                        }}
                                                                    >
                                                                        <Archive className="h-4 w-4" />
                                                                    </Button>
                                                                )
                                                            ) : (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 text-emerald-600 hover:bg-emerald-500/10"
                                                                    title="Restore"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setRestoreTarget(c.id);
                                                                    }}
                                                                >
                                                                    <RotateCcw className="h-4 w-4" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                            <TablePagination
                                totalItems={filtered.length}
                                pageSize={pageSize}
                                pageIndex={pageIndex}
                                onPageChange={setPageIndex}
                                onPageSizeChange={setPageSize}
                            />
                        </>
                    )}
                </TooltipProvider>
            </div>

            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create Category</DialogTitle>
                        <DialogDescription>Fill in the details to create a new asset category.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Category Name</Label>
                            <Input
                                value={form.categoryName}
                                onChange={(e) => setForm((f) => ({ ...f, categoryName: e.target.value }))}
                                placeholder="e.g. IT Equipment"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Input
                                value={form.description}
                                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                                placeholder="Category description"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Handling Type</Label>
                            <Select value={String(form.handlingType)} onValueChange={(v) => setForm((f) => ({ ...f, handlingType: Number(v) }))}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
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
                                onChange={(e) => setForm((f) => ({ ...f, salvagePercentage: e.target.value }))}
                                onBlur={() => {
                                    const n = Number(form.salvagePercentage);
                                    if (form.salvagePercentage === "" || isNaN(n)) return;
                                    setForm((f) => ({ ...f, salvagePercentage: String(Math.min(100, Math.max(0, n))) }));
                                }}
                                placeholder="e.g. 10"
                            />
                            <p className="text-xs text-muted-foreground">
                                Applied as default salvage percentage when registering assets in this category
                            </p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsFormOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave} disabled={addMutation.isPending}>
                            Create
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={archiveTarget !== null}
                onOpenChange={(open) => {
                    if (!open) setArchiveTarget(null);
                }}
                title="Archive Category"
                description="Are you sure you want to archive this category? It can be restored later from the archive view."
                confirmLabel="Archive"
                confirmVariant="destructive"
                onConfirm={async () => {
                    if (!archiveTarget) return;
                    try {
                        await archiveMutation.mutateAsync(archiveTarget);
                        setArchiveTarget(null);
                    } catch {
                        setArchiveTarget(null);
                    }
                }}
                isLoading={archiveMutation.isPending}
            />

            <ConfirmDialog
                open={restoreTarget !== null}
                onOpenChange={(open) => {
                    if (!open) setRestoreTarget(null);
                }}
                title="Restore Category"
                description="Are you sure you want to restore this category? It will become active again."
                confirmLabel="Restore"
                onConfirm={async () => {
                    if (!restoreTarget) return;
                    try {
                        await restoreMutation.mutateAsync(restoreTarget);
                        setRestoreTarget(null);
                    } catch {
                        setRestoreTarget(null);
                    }
                }}
                isLoading={restoreMutation.isPending}
            />

            <CategoryDetailsModal open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen} category={selectedCategory} onEdit={openEditModal} />

            <EditCategoryModal open={isEditModalOpen} onOpenChange={setIsEditModalOpen} category={selectedCategory} />
        </>
    );
}
