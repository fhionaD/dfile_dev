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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TablePagination, paginateData } from "@/components/ui/table-pagination";
import { RoomListView } from "@/components/room-list-view";
import { RoomModal } from "@/components/modals/create-room-modal";
import {
    useRooms, useRoomCategories,
    useAddRoom, useUpdateRoom, useArchiveRoom, useRestoreRoom,
    useAddRoomCategory, useUpdateRoomCategory, useArchiveRoomCategory, useRestoreRoomCategory,
} from "@/hooks/use-rooms";
import { Room, RoomCategory } from "@/types/asset";

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
    const addCategory = useAddRoomCategory();
    const updateCategory = useUpdateRoomCategory();
    const archiveCategory = useArchiveRoomCategory();
    const restoreCategory = useRestoreRoomCategory();
    const [catSearch, setCatSearch] = useState("");
    const [archiveCatTarget, setArchiveCatTarget] = useState<string | null>(null);
    const [catPageIndex, setCatPageIndex] = useState(0);
    const [catPageSize, setCatPageSize] = useState(10);

    // ── "Define Category" create modal state ──
    const [isCatCreateOpen, setIsCatCreateOpen] = useState(false);
    const [catCreateForm, setCatCreateForm] = useState({ name: "", subCategory: "", description: "" });
    const [isCreatingNewCatName, setIsCreatingNewCatName] = useState(false);

    // ── Unique category names for reuse ──
    const uniqueCategoryNames = useMemo(
        () => Array.from(new Set(allCategories.map(c => c.name))).sort(),
        [allCategories],
    );

    // ── Category edit modal state ──
    const [isCatEditOpen, setIsCatEditOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<RoomCategory | null>(null);
    const [catEditForm, setCatEditForm] = useState({ name: "", subCategory: "", description: "" });
    const [isEditCreatingNewCatName, setIsEditCreatingNewCatName] = useState(false);

    // ── Category details modal state ──
    const [detailCategory, setDetailCategory] = useState<RoomCategory | null>(null);
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
    const filteredCategories = useMemo(() => {
        if (!catSearch) return categories;
        const q = catSearch.toLowerCase();
        return categories.filter(c =>
            c.name.toLowerCase().includes(q) || c.subCategory.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q)
        );
    }, [categories, catSearch]);

    // ── Category create handlers ──
    const openCatCreate = () => {
        setCatCreateForm({ name: "", subCategory: "", description: "" });
        setIsCreatingNewCatName(uniqueCategoryNames.length === 0);
        setIsCatCreateOpen(true);
    };
    const handleCatCreate = () => {
        if (!catCreateForm.name.trim() || !catCreateForm.subCategory.trim()) return;
        addCategory.mutate(catCreateForm, {
            onSuccess: () => setIsCatCreateOpen(false),
        });
    };

    // ── Category edit handlers ──
    const openCatEdit = (cat: RoomCategory) => {
        setEditingCategory(cat);
        setCatEditForm({ name: cat.name, subCategory: cat.subCategory, description: cat.description });
        setIsEditCreatingNewCatName(!uniqueCategoryNames.includes(cat.name));
        setIsCatEditOpen(true);
    };
    const handleCatUpdate = () => {
        if (!editingCategory || !catEditForm.name.trim() || !catEditForm.subCategory.trim()) return;
        updateCategory.mutate({ id: editingCategory.id, payload: { ...catEditForm, rowVersion: editingCategory.rowVersion } }, {
            onSuccess: () => setIsCatEditOpen(false),
        });
    };

    // ── Category detail handlers ──
    const handleCatRowClick = (cat: RoomCategory) => {
        setDetailCategory(cat);
        setDetailOpen(true);
    };
    const handleEditFromDetails = () => {
        if (detailCategory) {
            setDetailOpen(false);
            openCatEdit(detailCategory);
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
                            <span className="text-sm text-muted-foreground">({filteredCategories.length})</span>
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
                    ) : filteredCategories.length === 0 ? (
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
                                        <TableHead>Sub Category</TableHead>
                                        <TableHead>Description</TableHead>
                                        <TableHead>Updated</TableHead>
                                        <TableHead className="w-[80px] text-center">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginateData(filteredCategories, catPageIndex, catPageSize).map(cat => (
                                        <TableRow key={cat.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleCatRowClick(cat)}>
                                            <TableCell className="font-medium">
                                                <button type="button" className="text-primary hover:underline text-left" onClick={(e) => { e.stopPropagation(); handleCatRowClick(cat); }}>{cat.name}</button>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">{cat.subCategory}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{cat.description || "—"}</TableCell>
                                            <TableCell className="text-muted-foreground text-xs">{new Date(cat.updatedAt || cat.createdAt || "").toLocaleDateString()}</TableCell>
                                            <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                                                {catShowArchived ? (
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600 hover:bg-emerald-500/10" title="Restore" onClick={() => restoreCategory.mutate(cat.id)}>
                                                        <RotateCcw className="h-4 w-4" />
                                                    </Button>
                                                ) : (
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" title="Archive" onClick={() => setArchiveCatTarget(cat.id)}>
                                                        <Archive className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            <TablePagination
                                totalItems={filteredCategories.length}
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
                        roomCategories={allCategories.map(c => ({ id: c.id, name: c.subCategory ? `${c.name} — ${c.subCategory}` : c.name }))}
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
                                {isCreatingNewCatName ? (
                                    <div className="space-y-1.5">
                                        <CountedInput value={catCreateForm.name} onChange={(v) => setCatCreateForm(f => ({ ...f, name: v }))} placeholder="e.g. Standard Room" />
                                        {uniqueCategoryNames.length > 0 && (
                                            <button type="button" className="text-xs text-primary hover:underline" onClick={() => setIsCreatingNewCatName(false)}>
                                                Select existing category
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <Select value={catCreateForm.name} onValueChange={(val) => {
                                        if (val === "__new__") {
                                            setIsCreatingNewCatName(true);
                                            setCatCreateForm(f => ({ ...f, name: "" }));
                                        } else {
                                            setCatCreateForm(f => ({ ...f, name: val }));
                                        }
                                    }}>
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Select category name" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {uniqueCategoryNames.map(n => (
                                                <SelectItem key={n} value={n}>{n}</SelectItem>
                                            ))}
                                            <SelectItem value="__new__">+ Create New Category Name</SelectItem>
                                        </SelectContent>
                                    </Select>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label className="flex items-center gap-1.5">
                                    <Layers className="h-3.5 w-3.5" /> Sub Category <span className="text-destructive">*</span>
                                </Label>
                                <CountedInput value={catCreateForm.subCategory} onChange={(v) => setCatCreateForm(f => ({ ...f, subCategory: v }))} placeholder="e.g. Single Room" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <CountedInput value={catCreateForm.description} onChange={(v) => setCatCreateForm(f => ({ ...f, description: v }))} placeholder="Brief description of this category" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCatCreateOpen(false)}>Cancel</Button>
                        <Button onClick={handleCatCreate} disabled={!catCreateForm.name.trim() || !catCreateForm.subCategory.trim() || addCategory.isPending}>
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
                                {isEditCreatingNewCatName ? (
                                    <div className="space-y-1.5">
                                        <CountedInput value={catEditForm.name} onChange={(v) => setCatEditForm(f => ({ ...f, name: v }))} placeholder="e.g. Standard Room" />
                                        {uniqueCategoryNames.length > 0 && (
                                            <button type="button" className="text-xs text-primary hover:underline" onClick={() => setIsEditCreatingNewCatName(false)}>
                                                Select existing category
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <Select value={catEditForm.name} onValueChange={(val) => {
                                        if (val === "__new__") {
                                            setIsEditCreatingNewCatName(true);
                                            setCatEditForm(f => ({ ...f, name: "" }));
                                        } else {
                                            setCatEditForm(f => ({ ...f, name: val }));
                                        }
                                    }}>
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Select category name" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {uniqueCategoryNames.map(n => (
                                                <SelectItem key={n} value={n}>{n}</SelectItem>
                                            ))}
                                            <SelectItem value="__new__">+ Create New Category Name</SelectItem>
                                        </SelectContent>
                                    </Select>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label>Sub Category <span className="text-destructive">*</span></Label>
                                <CountedInput value={catEditForm.subCategory} onChange={(v) => setCatEditForm(f => ({ ...f, subCategory: v }))} placeholder="e.g. Single Room" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <CountedInput value={catEditForm.description} onChange={(v) => setCatEditForm(f => ({ ...f, description: v }))} placeholder="Brief description" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCatEditOpen(false)}>Cancel</Button>
                        <Button onClick={handleCatUpdate} disabled={!catEditForm.name.trim() || !catEditForm.subCategory.trim() || updateCategory.isPending}>
                            Update
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ════════════  CATEGORY DETAILS DIALOG  ════════════ */}
            <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
                <DialogContent className="max-w-md rounded-2xl border-border p-0 overflow-hidden flex flex-col gap-0 shadow-lg">
                    {detailCategory && (
                        <>
                            <DialogHeader className="p-6 bg-muted/30 border-b border-border shrink-0">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-background border border-border/50 text-primary shadow-sm">
                                        <Layers size={24} strokeWidth={1.5} />
                                    </div>
                                    <div>
                                        <DialogTitle className="text-lg font-semibold text-foreground">Room Category Details</DialogTitle>
                                        <DialogDescription className="text-muted-foreground text-xs mt-1">
                                            {detailCategory.name}{detailCategory.subCategory ? ` — ${detailCategory.subCategory}` : ""}
                                        </DialogDescription>
                                    </div>
                                </div>
                            </DialogHeader>
                            <div className="p-6 space-y-3 flex-1 overflow-y-auto bg-background">
                                {[
                                    { label: "Category Name", value: detailCategory.name },
                                    { label: "Sub Category", value: detailCategory.subCategory },
                                    { label: "Description", value: detailCategory.description || "—" },
                                    { label: "Created By", value: detailCategory.createdByName || "—" },
                                    { label: "Created At", value: detailCategory.createdAt ? new Date(detailCategory.createdAt).toLocaleDateString() : "—" },
                                    { label: "Updated By", value: detailCategory.updatedByName || detailCategory.createdByName || "—" },
                                    { label: "Updated At", value: new Date(detailCategory.updatedAt || detailCategory.createdAt || "").toLocaleDateString() },
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
                                {!detailCategory.isArchived && (
                                    <Button onClick={handleEditFromDetails}>
                                        <Edit className="mr-2 h-4 w-4" /> Edit
                                    </Button>
                                )}
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* ════════════  ROOM UNIT CREATE/EDIT MODAL  ════════════ */}
            <RoomModal
                open={createRoomOpen}
                onOpenChange={(open) => { setCreateRoomOpen(open); if (!open) setEditingRoom(null); }}
                roomCategories={allCategories}
                initialData={editingRoom}
                defaultEditing={!!editingRoom}
                onSave={(room) => {
                    if (editingRoom) {
                        updateRoom.mutate({ id: editingRoom.id, payload: { unitId: room.unitId, name: room.name, floor: room.floor ?? "", categoryId: room.categoryId, status: room.status, maxOccupancy: room.maxOccupancy } });
                    } else {
                        addRoom.mutate({ unitId: room.unitId, name: room.name, floor: room.floor ?? "", categoryId: room.categoryId, status: room.status, maxOccupancy: room.maxOccupancy });
                    }
                }}
            />

            {/* ════════════  CONFIRM DIALOGS  ════════════ */}
            <ConfirmDialog
                open={archiveCatTarget !== null}
                onOpenChange={(open) => { if (!open) setArchiveCatTarget(null); }}
                title="Archive Room Category"
                description="Are you sure you want to archive this room category? Categories with active room units cannot be archived."
                confirmLabel="Archive"
                confirmVariant="destructive"
                onConfirm={async () => {
                    if (archiveCatTarget) {
                        archiveCategory.mutate(archiveCatTarget);
                        setArchiveCatTarget(null);
                    }
                }}
            />
        </div>
    );
}
