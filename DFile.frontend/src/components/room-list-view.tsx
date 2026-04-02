import { useState, useMemo } from "react";
import { Layers, Plus, Archive, RotateCcw, Filter, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Room } from "@/types/asset";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RoomDetailsModal } from "./modals/room-details-modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
    ArchiveViewToggleButton,
    DataTablePrimaryButton,
    DataTableSearch,
    DataTableToolbar,
    dataTableFilterTriggerClass,
} from "@/components/data-table/data-table-toolbar";

interface RoomListViewProps {
    rooms: Room[];
    roomCategories: { id: string; name: string; subCategory?: string }[];
    showArchived: boolean;
    onToggleArchived: () => void;
    onCreateRoom?: () => void;
    onManageCategories?: () => void;
    onRoomClick?: (room: Room) => void;
    onArchiveRoom?: (id: string) => void;
    onRestoreRoom?: (id: string) => void;
    readOnly?: boolean;
    /** Totals for archive toggle labels (tenant-wide room units). */
    activeCount?: number;
    archivedCount?: number;
}

export function RoomListView({
    rooms,
    roomCategories,
    showArchived,
    onToggleArchived,
    onCreateRoom,
    onManageCategories,
    onRoomClick,
    onArchiveRoom,
    onRestoreRoom,
    readOnly = false,
    activeCount,
    archivedCount,
}: RoomListViewProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [categoryIdFilter, setCategoryIdFilter] = useState<string>("all");
    const [floorFilter, setFloorFilter] = useState<string>("all");

    const [selectedRoomForDetails, setSelectedRoomForDetails] = useState<Room | null>(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [archiveTarget, setArchiveTarget] = useState<string | null>(null);
    const [restoreTarget, setRestoreTarget] = useState<string | null>(null);

    const sortedRoomCategories = useMemo(
        () => [...roomCategories].sort((a, b) => a.name.localeCompare(b.name)),
        [roomCategories],
    );

    const uniqueFloors = useMemo(() => {
        const floors = new Set(rooms.map(r => r.floor).filter(f => f !== null && f !== undefined));
        return Array.from(floors).sort((a, b) => {
            const numA = Number(a);
            const numB = Number(b);
            if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
            return String(a).localeCompare(String(b));
        });
    }, [rooms]);

    const getRoomCategory = (id: string) => {
        return roomCategories.find(c => c.id === id);
    };

    const handleRowClick = (room: Room) => {
        setSelectedRoomForDetails(room);
        setIsDetailsModalOpen(true);
    };

    const handleEditFromDetails = () => {
        if (selectedRoomForDetails && onRoomClick) {
            onRoomClick(selectedRoomForDetails);
        }
    };

    const filteredRooms = rooms.filter(room => {
        if (categoryIdFilter !== "all" && room.categoryId !== categoryIdFilter) return false;

        if (floorFilter !== "all") {
            if (room.floor === null || room.floor === undefined) return false;
            if (room.floor.toString() !== floorFilter) return false;
        }

        if (!searchQuery) return true;

        const query = searchQuery.toLowerCase().trim();

        if (room.floor && room.floor.toString().toLowerCase() === query) return true;

        const name = room.name ? room.name.toLowerCase() : "";
        const unitId = room.unitId ? room.unitId.toLowerCase() : "";

        const category = getRoomCategory(room.categoryId);
        const categoryName = category ? category.name.toLowerCase() : "";

        const subCatName = room.subCategoryName ? room.subCategoryName.toLowerCase() : "";

        return name.includes(query) || unitId.includes(query) || categoryName.includes(query) || subCatName.includes(query);
    });

    const colRoom = readOnly ? "w-[25%]" : "w-[20%]";
    const colCat = readOnly ? "w-[25%]" : "w-[20%]";
    const colSub = readOnly ? "w-[25%]" : "w-[20%]";
    const colFloor = readOnly ? "w-[25%]" : "w-[18%]";
    const colActions = "w-[120px]";

    return (
        <>
            <div className="overflow-hidden rounded-md border">
                <DataTableToolbar
                    left={
                        <>
                            <DataTableSearch
                                value={searchQuery}
                                onChange={setSearchQuery}
                                placeholder="Search room, floor or category..."
                                ariaLabel="Search room units"
                            />
                            <Select value={categoryIdFilter} onValueChange={setCategoryIdFilter}>
                                <SelectTrigger className={dataTableFilterTriggerClass}>
                                    <Package className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                                    <SelectValue placeholder="Category" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All categories</SelectItem>
                                    {sortedRoomCategories.map((c) => (
                                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select value={floorFilter} onValueChange={setFloorFilter}>
                                <SelectTrigger className={dataTableFilterTriggerClass}>
                                    <Filter className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                                    <SelectValue placeholder="Floor" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Floors</SelectItem>
                                    {uniqueFloors.map((floor) => (
                                        <SelectItem key={String(floor)} value={String(floor)}>
                                            Floor {String(floor)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </>
                    }
                    right={
                        <>
                            {!readOnly && !showArchived && onManageCategories && (
                                <Button variant="outline" size="sm" className="hidden h-10 min-w-[120px] rounded-lg px-4 sm:flex" type="button" onClick={onManageCategories}>
                                    <Layers size={16} className="mr-2 shrink-0" />
                                    Manage Categories
                                </Button>
                            )}
                            {!readOnly && !showArchived && onCreateRoom && (
                                <DataTablePrimaryButton onClick={onCreateRoom}>
                                    <Plus size={16} className="mr-2 shrink-0" />
                                    Create Unit
                                </DataTablePrimaryButton>
                            )}
                            {!readOnly && (
                                <ArchiveViewToggleButton
                                    showArchived={showArchived}
                                    onToggle={onToggleArchived}
                                    activeCount={activeCount}
                                    archivedCount={archivedCount}
                                />
                            )}
                        </>
                    }
                />

                <div className="overflow-x-auto">
                    <Table className="w-full table-fixed">
                        <TableHeader>
                            <TableRow>
                                <TableHead className={colRoom}>Room Number</TableHead>
                                <TableHead className={colCat}>Category</TableHead>
                                <TableHead className={colSub}>Sub-category</TableHead>
                                <TableHead className={colFloor}>Floor</TableHead>
                                {!readOnly && <TableHead className={`${colActions} text-center`}>Actions</TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredRooms.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={readOnly ? 4 : 5} className="h-32 text-center text-muted-foreground">
                                        {showArchived ? "No archived room units yet" : "No room units match your search."}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredRooms.map((room) => {
                                    const category = getRoomCategory(room.categoryId);
                                    return (
                                        <TableRow
                                            key={room.id}
                                            className="cursor-pointer transition-colors hover:bg-muted/50"
                                            onClick={() => handleRowClick(room)}
                                        >
                                            <TableCell className={`max-w-0 font-medium ${colRoom}`}>
                                                <span className="block truncate">{room.name || "—"}</span>
                                            </TableCell>
                                            <TableCell className={`max-w-0 ${colCat}`}>
                                                <span className="block truncate">{category?.name || "—"}</span>
                                            </TableCell>
                                            <TableCell className={`max-w-0 text-muted-foreground ${colSub}`}>
                                                <span className="block truncate">{room.subCategoryName || "—"}</span>
                                            </TableCell>
                                            <TableCell className={`max-w-0 text-muted-foreground ${colFloor}`}>
                                                <span className="block truncate">{room.floor ?? "—"}</span>
                                            </TableCell>
                                            {!readOnly && (
                                                <TableCell className={`${colActions} text-center`}>
                                                    {showArchived ? (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-700"
                                                            title="Restore"
                                                            onClick={(e) => { e.stopPropagation(); setRestoreTarget(room.id); }}
                                                        >
                                                            <RotateCcw className="h-4 w-4" />
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-destructive/70 hover:bg-destructive/10 hover:text-destructive"
                                                            title="Archive"
                                                            onClick={(e) => { e.stopPropagation(); setArchiveTarget(room.id); }}
                                                        >
                                                            <Archive className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>

                <div className="border-t border-border/40 px-6 py-3 text-sm text-muted-foreground">
                    Showing {filteredRooms.length} room{filteredRooms.length === 1 ? "" : "s"}
                </div>
            </div>

            <RoomDetailsModal
                open={isDetailsModalOpen}
                onOpenChange={setIsDetailsModalOpen}
                room={selectedRoomForDetails}
                roomCategories={roomCategories}
                onEdit={handleEditFromDetails}
            />

            <ConfirmDialog
                open={archiveTarget !== null}
                onOpenChange={(open) => { if (!open) setArchiveTarget(null); }}
                title="Archive Room"
                description="Are you sure you want to archive this room? It can be restored later from the archive view."
                confirmLabel="Archive"
                confirmVariant="destructive"
                onConfirm={() => {
                    if (archiveTarget) {
                        onArchiveRoom?.(archiveTarget);
                        setArchiveTarget(null);
                    }
                }}
            />

            <ConfirmDialog
                open={restoreTarget !== null}
                onOpenChange={(open) => { if (!open) setRestoreTarget(null); }}
                title="Restore Room"
                description="Are you sure you want to restore this room unit? It will become active again."
                confirmLabel="Restore"
                onConfirm={() => {
                    if (restoreTarget) {
                        onRestoreRoom?.(restoreTarget);
                        setRestoreTarget(null);
                    }
                }}
            />
        </>
    );
}
