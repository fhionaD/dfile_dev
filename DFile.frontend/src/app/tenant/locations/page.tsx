"use client";

import { useState, useMemo } from "react";
import { MapPin, Layers, DoorOpen, Plus, Search, Archive, RotateCcw, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TablePagination, paginateData } from "@/components/ui/table-pagination";
import { RoomListView } from "@/components/room-list-view";
import { RoomModal } from "@/components/modals/create-room-modal";
import { toast } from "sonner";
import {
    useRooms, useRoomCategories, useRoomSubCategories,
    useAddRoom, useUpdateRoom, useArchiveRoom, useRestoreRoom,
    useAddRoomCategory, useUpdateRoomCategory, useArchiveRoomCategory, useRestoreRoomCategory,
    useAddRoomSubCategory, useUpdateRoomSubCategory,
} from "@/hooks/use-rooms";
import { Room, RoomCategory, RoomSubCategory } from "@/types/asset";

type CategorySubCategoryRow = {
    key: string;
    category: RoomCategory;
    subCategory: RoomSubCategory | null;
};

// ─── Category Details Dialog ─────────────────────────────────────
function CategoryDetailsDialog({ detailRow, detailOpen, setDetailOpen, handleEditFromDetails }: {
    detailRow: CategorySubCategoryRow | null;
    detailOpen: boolean;
    setDetailOpen: (v: boolean) => void;
    handleEditFromDetails: () => void;
}) {
    if (!detailRow) return null;

    return (
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
            <DialogContent className="max-w-md rounded-2xl border-border p-0 overflow-hidden flex flex-col gap-0 shadow-lg">
                <DialogHeader className="p-6 bg-muted/30 border-b border-border shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-background border border-border/50 text-primary shadow-sm">
                            <Layers size={24} strokeWidth={1.5} />
                        </div>
                        <div>
                            <DialogTitle className="text-lg font-semibold text-foreground">Room Category Details</DialogTitle>
                            <DialogDescription className="text-muted-foreground text-xs mt-1">
                                {detailRow.category.name} {detailRow.subCategory ? `- ${detailRow.subCategory.name}` : ""}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>
                <div className="p-6 space-y-3 flex-1 overflow-y-auto bg-background">
                    {[
                        { label: "Category Name", value: detailRow.category.name },
                        { label: "Sub-Category", value: detailRow.subCategory?.name || "—" },
                        { label: "Description", value: detailRow.subCategory?.description || "—" },
                        { label: "Created By", value: detailRow.subCategory?.createdByName || detailRow.category.createdByName || "—" },
                        { label: "Created At", value: detailRow.subCategory?.createdAt ? new Date(detailRow.subCategory.createdAt).toLocaleDateString() : detailRow.category.createdAt ? new Date(detailRow.category.createdAt).toLocaleDateString() : "—" },
                        { label: "Updated By", value: detailRow.subCategory?.updatedByName || detailRow.category.updatedByName || detailRow.category.createdByName || "—" },
                        { label: "Updated At", value: new Date(detailRow.subCategory?.updatedAt || detailRow.category.updatedAt || detailRow.category.createdAt || "").toLocaleDateString() },
                    ].map((f) => (
                        <div key={f.label} className="flex justify-between items-baseline py-2 border-b border-border/30 last:border-0">
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{f.label}</span>
                            <span className="text-sm font-medium text-foreground text-right max-w-[60%]">
                                {f.value}
                            </span>
                        </div>
                    ))}
                </div>
                <DialogFooter className="p-6 bg-muted/30 border-t border-border shrink-0 flex justify-end gap-3">
                    <Button variant="outline" onClick={() => setDetailOpen(false)}>Close</Button>
                    {!detailRow.category.isArchived && (
                        <Button onClick={handleEditFromDetails}>
                            <Edit className="mr-2 h-4 w-4" /> Edit
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ─── Character Counter Input ─────────────────────────────────────
function CountedInput({ value, onChange, maxLength = 50, ...props }: { value: string; onChange: (v: string) => void; maxLength?: number } & Omit<React.ComponentProps<typeof Input>, 'value' | 'onChange'>) {
    return (
        <div className="relative">
            <Input value={value} onChange={(e) => onChange(e.target.value.slice(0, maxLength))} maxLength={maxLength} {...props} />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground pointer-events-none">{value.length} / {maxLength}</span>
        </div>
    );
}

export default function LocationsPage() {
    const [activeTab, setActiveTab] = useState("categories");

    // ── Room Category state ──
    const [catShowArchived, setCatShowArchived] = useState(false);
    const { data: categories = [], isLoading: catsLoading } = useRoomCategories(catShowArchived);
    const { data: catCountOpposite = [] } = useRoomCategories(!catShowArchived);
    const catArchivedCount = catShowArchived ? categories.length : catCountOpposite.length;
    const catActiveCount = catShowArchived ? catCountOpposite.length : categories.length;
    const { data: allCategories = [] } = useRoomCategories(false);
    const { data: allSubCategories = [] } = useRoomSubCategories(undefined, false);
    const addCategory = useAddRoomCategory();
    const updateCategory = useUpdateRoomCategory();
    const archiveCategory = useArchiveRoomCategory();
    const restoreCategory = useRestoreRoomCategory();
    const addSubCategory = useAddRoomSubCategory();
    const updateSubCategory = useUpdateRoomSubCategory();
    const [catSearch, setCatSearch] = useState("");
    const [archiveCatTarget, setArchiveCatTarget] = useState<string | null>(null);
    const [restoreCatTarget, setRestoreCatTarget] = useState<string | null>(null);
    const [catPageIndex, setCatPageIndex] = useState(0);
    const [catPageSize, setCatPageSize] = useState(10);

    // ── "Define Category" create modal state ──
    const [isCatCreateOpen, setIsCatCreateOpen] = useState(false);
    const [catCreateForm, setCatCreateForm] = useState({ name: "", subCategoryName: "", description: "" });

    // ── Category edit modal state ──
    const [isCatEditOpen, setIsCatEditOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<RoomCategory | null>(null);
    const [editingSubCategory, setEditingSubCategory] = useState<RoomSubCategory | null>(null);
    const [catEditForm, setCatEditForm] = useState({ name: "", subCategoryName: "", description: "" });

    // ── Category details modal state ──
    const [detailRow, setDetailRow] = useState<CategorySubCategoryRow | null>(null);
    const [detailOpen, setDetailOpen] = useState(false);

    // ── Room Units state ──
    const [showArchived, setShowArchived] = useState(false);
    const { data: rooms = [], isLoading: roomsLoading } = useRooms(showArchived);
    const { data: roomCountOpposite = [] } = useRooms(!showArchived);
    const archivedCount = showArchived ? rooms.length : roomCountOpposite.length;
    const activeCount = showArchived ? roomCountOpposite.length : rooms.length;
    const archiveRoom = useArchiveRoom();
    const restoreRoom = useRestoreRoom();
    const addRoom = useAddRoom();
    const updateRoom = useUpdateRoom();
    const [createRoomOpen, setCreateRoomOpen] = useState(false);
    const [editingRoom, setEditingRoom] = useState<Room | null>(null);

    // ── Filtered categories ──
    const filteredCategories = useMemo(() => categories, [categories]);

    const categorySubCategoryRows = useMemo(() => {
        const q = catSearch.trim().toLowerCase();
        const rows = filteredCategories.flatMap((cat): CategorySubCategoryRow[] => {
            const subs = allSubCategories.filter(sc => sc.roomCategoryId === cat.id);
            if (subs.length === 0) {
                return [{
                    key: `${cat.id}__none__`,
                    category: cat,
                    subCategory: null,
                }];
            }

            return subs.map(sc => ({
                key: `${cat.id}_${sc.id}`,
                category: cat,
                subCategory: sc,
            }));
        });

        if (!q) return rows;

        return rows.filter(r =>
            r.category.name.toLowerCase().includes(q) ||
            (r.category.description || "").toLowerCase().includes(q) ||
            (r.subCategory?.name || "").toLowerCase().includes(q)
        );
    }, [filteredCategories, allSubCategories, catSearch]);

    // ── Category create handlers ──
    const openCatCreate = () => {
        setCatCreateForm({ name: "", subCategoryName: "", description: "" });
        setIsCatCreateOpen(true);
    };
    const handleCatCreate = () => {
        const categoryName = catCreateForm.name.trim();
        const subCatName = catCreateForm.subCategoryName.trim();
        if (!categoryName || !subCatName) return;

        const existingCategory = allCategories.find(c => c.name.trim().toLowerCase() === categoryName.toLowerCase());

        if (existingCategory) {
            const duplicateSub = allSubCategories.some(sc =>
                sc.roomCategoryId === existingCategory.id &&
                (sc.name || "").trim().toLowerCase() === subCatName.toLowerCase()
            );
            if (duplicateSub) {
                toast.error("This category and sub-category pair already exists.");
                return;
            }

            addSubCategory.mutate(
                { name: subCatName, description: catCreateForm.description.trim(), roomCategoryId: existingCategory.id },
                { onSuccess: () => setIsCatCreateOpen(false) }
            );
            return;
        }

        addCategory.mutate(
            { name: categoryName, description: catCreateForm.description.trim() },
            {
                onSuccess: (newCategory) => {
                    addSubCategory.mutate(
                        { name: subCatName, description: catCreateForm.description.trim(), roomCategoryId: newCategory.id },
                        { onSuccess: () => setIsCatCreateOpen(false) }
                    );
                },
            }
        );
    };

    // ── Category edit handlers ──
    const openCatEdit = (row: CategorySubCategoryRow) => {
        setEditingCategory(row.category);
        setEditingSubCategory(row.subCategory);
        setCatEditForm({
            name: row.category.name,
            subCategoryName: row.subCategory?.name || "",
            // Description belongs to the subcategory, not the shared parent category
            description: row.subCategory?.description || "",
        });
        setIsCatEditOpen(true);
    };
    const handleCatUpdate = () => {
        if (!editingCategory || !catEditForm.name.trim()) return;
        if (editingSubCategory && !catEditForm.subCategoryName.trim()) return;

        const nextCategoryName = catEditForm.name.trim();
        const nextDescription = catEditForm.description.trim();
        const nextSubCategoryName = catEditForm.subCategoryName.trim();

        // Category-level: only the name is shared across subcategories
        const hasCategoryChanges = editingCategory.name !== nextCategoryName;
        // Subcategory-level: name AND description are independent per subcategory
        const hasSubCategoryChanges = !!editingSubCategory && (
            editingSubCategory.name !== nextSubCategoryName ||
            (editingSubCategory.description || "") !== nextDescription
        );

        const finish = () => {
            setIsCatEditOpen(false);
            setEditingCategory(null);
            setEditingSubCategory(null);
        };

        const updateSubCategoryStep = () => {
            if (!editingSubCategory || !hasSubCategoryChanges) {
                finish();
                return;
            }

            updateSubCategory.mutate(
                {
                    id: editingSubCategory.id,
                    payload: {
                        name: nextSubCategoryName,
                        description: nextDescription,
                        rowVersion: editingSubCategory.rowVersion,
                    },
                },
                { onSuccess: finish }
            );
        };

        if (hasCategoryChanges) {
            updateCategory.mutate(
                {
                    id: editingCategory.id,
                    payload: {
                        name: nextCategoryName,
                        description: editingCategory.description || "",
                        rowVersion: editingCategory.rowVersion,
                    },
                },
                { onSuccess: updateSubCategoryStep }
            );
            return;
        }

        updateSubCategoryStep();
    };

    // ── Category detail handlers ──
    const handleCatRowClick = (row: CategorySubCategoryRow) => {
        setDetailRow(row);
        setDetailOpen(true);
    };
    const handleEditFromDetails = () => {
        if (detailRow) {
            setDetailOpen(false);
            openCatEdit(detailRow);
        }
    };

    // ── Room handlers ──
    const handleRoomEdit = (room: Room) => {
        setEditingRoom(room);
        setCreateRoomOpen(true);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <MapPin className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                    <h1 className="text-xl font-semibold tracking-tight">Locations</h1>
                    <p className="text-sm text-muted-foreground">Manage room categories and room units in one place</p>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2 max-w-md">
                    <TabsTrigger value="categories" className="gap-2">
                        <Layers className="h-4 w-4" /> Room Category
                    </TabsTrigger>
                    <TabsTrigger value="units" className="gap-2">
                        <DoorOpen className="h-4 w-4" /> Room Units
                    </TabsTrigger>
                </TabsList>

                {/* ════════════  ROOM CATEGORY TAB  ════════════ */}
                <TabsContent value="categories" className="space-y-4 mt-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <h2 className="text-lg font-semibold">{catShowArchived ? "Archived Room Categories" : "Room Categories"}</h2>
                            <span className="text-sm text-muted-foreground">({categorySubCategoryRows.length})</span>
                        </div>
                        <div className="flex gap-2">
                            <div className="relative flex-1 sm:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input placeholder="Search categories..." value={catSearch} onChange={(e) => setCatSearch(e.target.value)} className="pl-10 h-10" />
                            </div>
                            <Button onClick={openCatCreate} className="gap-2 h-10">
                                <Plus className="h-4 w-4" /> Define Category
                            </Button>
                            <Button variant={catShowArchived ? "default" : "outline"} className="h-10" onClick={() => setCatShowArchived(!catShowArchived)}>
                                {catShowArchived ? (
                                    <><RotateCcw className="h-4 w-4 mr-2" />Active ({catActiveCount})</>
                                ) : (
                                    <><Archive className="h-4 w-4 mr-2" />Archived ({catArchivedCount})</>
                                )}
                            </Button>
                        </div>
                    </div>

                    {catsLoading ? (
                        <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
                    ) : categorySubCategoryRows.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground rounded-md border min-h-[520px] flex flex-col items-center justify-center">
                            <Layers className="h-12 w-12 mx-auto mb-4 opacity-20" />
                            <p>{catShowArchived ? "No archived room categories" : "No room categories found"}</p>
                            {!catShowArchived && <p className="text-xs mt-1">Define a category to get started</p>}
                        </div>
                    ) : (
                        <div className="rounded-md border overflow-auto min-h-[520px]">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Category</TableHead>
                                        <TableHead>Sub-categories</TableHead>
                                        <TableHead>Description</TableHead>
                                        <TableHead>Updated</TableHead>
                                        <TableHead className="w-[80px] text-center">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginateData(categorySubCategoryRows, catPageIndex, catPageSize).map((row) => (
                                        <TableRow key={row.key} className="cursor-pointer hover:bg-muted/50" onClick={() => handleCatRowClick(row)}>
                                            <TableCell className="font-medium">
                                                <button type="button" className="text-primary hover:underline text-left" onClick={(e) => { e.stopPropagation(); handleCatRowClick(row); }}>{row.category.name}</button>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">{row.subCategory?.name || "—"}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{row.subCategory?.description || "—"}</TableCell>
                                            <TableCell className="text-muted-foreground text-xs">{new Date(row.category.updatedAt || row.category.createdAt || "").toLocaleDateString()}</TableCell>
                                            <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                                                {catShowArchived ? (
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600 hover:bg-emerald-500/10" title="Restore" onClick={() => setRestoreCatTarget(row.category.id)}>
                                                        <RotateCcw className="h-4 w-4" />
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                                        title="Archive"
                                                        onClick={() => setArchiveCatTarget(row.category.id)}
                                                    >
                                                        <Archive className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            <TablePagination
                                totalItems={categorySubCategoryRows.length}
                                pageSize={catPageSize}
                                pageIndex={catPageIndex}
                                onPageChange={setCatPageIndex}
                                onPageSizeChange={setCatPageSize}
                            />
                        </div>
                    )}
                </TabsContent>

                {/* ════════════  ROOM UNITS TAB  ════════════ */}
                <TabsContent value="units" className="space-y-4 mt-4">
                    <RoomListView
                        rooms={rooms}
                        roomCategories={allCategories.map(c => ({ id: c.id, name: c.name }))}
                        showArchived={showArchived}
                        archivedCount={archivedCount}
                        activeCount={activeCount}
                        onToggleArchived={() => setShowArchived(!showArchived)}
                        onCreateRoom={() => { setEditingRoom(null); setCreateRoomOpen(true); }}
                        onArchiveRoom={(id) => archiveRoom.mutate(id)}
                        onRestoreRoom={(id) => restoreRoom.mutate(id)}
                        onRoomClick={handleRoomEdit}
                    />
                </TabsContent>
            </Tabs>

            {/* ════════════  DEFINE CATEGORY DIALOG (CREATE)  ════════════ */}
            <Dialog open={isCatCreateOpen} onOpenChange={setIsCatCreateOpen}>
                <DialogContent className="sm:max-w-[520px]">
                    <DialogHeader>
                        <div className="flex items-center gap-3">
                            <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                                <Layers className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <DialogTitle className="text-lg">Define Room Category</DialogTitle>
                                <DialogDescription>Add a new room category classification</DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>
                    <div className="space-y-4 pt-2">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="flex items-center gap-1.5">
                                    <Layers className="h-3.5 w-3.5" /> Category Name <span className="text-destructive">*</span>
                                </Label>
                                <CountedInput value={catCreateForm.name} onChange={(v) => setCatCreateForm(f => ({ ...f, name: v }))} placeholder="e.g. Deluxe Room" />
                            </div>
                            <div className="space-y-2">
                                <Label className="flex items-center gap-1.5">
                                    <Layers className="h-3.5 w-3.5" /> Sub-Category <span className="text-destructive">*</span>
                                </Label>
                                <CountedInput value={catCreateForm.subCategoryName} onChange={(v) => setCatCreateForm(f => ({ ...f, subCategoryName: v }))} placeholder="e.g. Deluxe King" maxLength={100} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <CountedInput value={catCreateForm.description} onChange={(v) => setCatCreateForm(f => ({ ...f, description: v }))} placeholder="Brief description of this category" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCatCreateOpen(false)}>Cancel</Button>
                        <Button onClick={handleCatCreate} disabled={!catCreateForm.name.trim() || !catCreateForm.subCategoryName.trim() || addCategory.isPending || addSubCategory.isPending}>
                            Define Category
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ════════════  EDIT CATEGORY DIALOG  ════════════ */}
            <Dialog open={isCatEditOpen} onOpenChange={setIsCatEditOpen}>
                <DialogContent className="sm:max-w-[520px]">
                    <DialogHeader>
                        <DialogTitle>Edit Room Category</DialogTitle>
                        <DialogDescription>Update the category details below.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Category Name <span className="text-destructive">*</span></Label>
                                <CountedInput value={catEditForm.name} onChange={(v) => setCatEditForm(f => ({ ...f, name: v }))} placeholder="e.g. Deluxe Room" />
                            </div>
                            <div className="space-y-2">
                                <Label className="flex items-center gap-1.5">
                                    <Layers className="h-3.5 w-3.5" /> Sub-Category {editingSubCategory && <span className="text-destructive">*</span>}
                                </Label>
                                <CountedInput value={catEditForm.subCategoryName} onChange={(v) => setCatEditForm(f => ({ ...f, subCategoryName: v }))} placeholder="e.g. Double Bed / Ocean View" maxLength={100} />
                                {editingCategory && (() => {
                                    const existingSubs = allSubCategories.filter(sc => sc.roomCategoryId === editingCategory.id);
                                    return existingSubs.length > 0 ? (
                                        <p className="text-xs text-muted-foreground">Existing: {existingSubs.map(sc => sc.name).join(", ")}</p>
                                    ) : null;
                                })()}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <CountedInput value={catEditForm.description} onChange={(v) => setCatEditForm(f => ({ ...f, description: v }))} placeholder="Brief description" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setIsCatEditOpen(false); setEditingSubCategory(null); setEditingCategory(null); }}>Cancel</Button>
                        <Button onClick={handleCatUpdate} disabled={!catEditForm.name.trim() || (editingSubCategory && !catEditForm.subCategoryName.trim()) || updateCategory.isPending || updateSubCategory.isPending}>
                            Update
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ════════════  CATEGORY DETAILS DIALOG  ════════════ */}
            <CategoryDetailsDialog
                detailRow={detailRow}
                detailOpen={detailOpen}
                setDetailOpen={setDetailOpen}
                handleEditFromDetails={handleEditFromDetails}
            />

            {/* ════════════  ROOM UNIT CREATE/EDIT MODAL  ════════════ */}
            <RoomModal
                open={createRoomOpen}
                onOpenChange={(open) => { setCreateRoomOpen(open); if (!open) setEditingRoom(null); }}
                roomCategories={allCategories}
                subCategories={allSubCategories}
                initialData={editingRoom}
                defaultEditing={!!editingRoom}
                onSave={(room) => {
                    if (editingRoom) {
                        updateRoom.mutate({ id: editingRoom.id, payload: { unitId: room.unitId, name: room.name, floor: room.floor ?? "", categoryId: room.categoryId, subCategoryId: room.subCategoryId, status: room.status, maxOccupancy: room.maxOccupancy } });
                    } else {
                        addRoom.mutate({ unitId: room.unitId, name: room.name, floor: room.floor ?? "", categoryId: room.categoryId, subCategoryId: room.subCategoryId, status: room.status, maxOccupancy: room.maxOccupancy });
                    }
                }}
            />

            {/* ════════════  CONFIRM DIALOGS  ════════════ */}
            {(() => {
                const targetCat = archiveCatTarget ? allCategories.find(c => c.id === archiveCatTarget) : null;
                const cascadeRooms = targetCat?.roomCount ?? 0;
                const cascadeSubs = targetCat?.subCategoryCount ?? 0;
                const cascadeNote = cascadeRooms > 0
                    ? ` This will also archive ${cascadeRooms} room unit${cascadeRooms !== 1 ? "s" : ""}${cascadeSubs > 0 ? ` and ${cascadeSubs} sub-categor${cascadeSubs !== 1 ? "ies" : "y"}` : ""} assigned to it.`
                    : cascadeSubs > 0
                        ? ` This will also archive ${cascadeSubs} sub-categor${cascadeSubs !== 1 ? "ies" : "y"} under it.`
                        : "";
                return (
                    <ConfirmDialog
                        open={archiveCatTarget !== null}
                        onOpenChange={(open) => { if (!open) setArchiveCatTarget(null); }}
                        title="Archive Room Category"
                        description={`Are you sure you want to archive this room category?${cascadeNote}`}
                        confirmLabel="Archive"
                        confirmVariant="destructive"
                        onConfirm={async () => {
                            if (archiveCatTarget) {
                                archiveCategory.mutate(archiveCatTarget);
                                setArchiveCatTarget(null);
                            }
                        }}
                    />
                );
            })()}

            <ConfirmDialog
                open={restoreCatTarget !== null}
                onOpenChange={(open) => { if (!open) setRestoreCatTarget(null); }}
                title="Restore Room Category"
                description="Are you sure you want to restore this room category? It will become active again."
                confirmLabel="Restore"
                onConfirm={async () => {
                    if (restoreCatTarget) {
                        restoreCategory.mutate(restoreCatTarget);
                        setRestoreCatTarget(null);
                    }
                }}
            />
        </div>
    );
}
