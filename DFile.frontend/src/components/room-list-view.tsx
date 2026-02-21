import { useState, useMemo } from "react";
import { DoorOpen, Layers, Building2, Plus, Search, Archive, RotateCcw, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Room } from "@/types/asset";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RoomDetailsModal } from "./modals/room-details-modal";

interface RoomListViewProps {
    rooms: Room[];
    roomCategories: { id: string; name: string; subCategory?: string }[];
    onCreateRoom: () => void;
    onManageCategories: () => void;
    onRoomClick?: (room: Room) => void;
    onArchiveRoom?: (id: string) => void;
}

export function RoomListView({ rooms, roomCategories, onCreateRoom, onManageCategories, onRoomClick, onArchiveRoom }: RoomListViewProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [showArchived, setShowArchived] = useState(false);
    const [floorFilter, setFloorFilter] = useState<string>("all");
    
    // Details Modal State
    const [selectedRoomForDetails, setSelectedRoomForDetails] = useState<Room | null>(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

    // Get unique floors for filter
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
        // Archive Status
        if (showArchived !== !!room.archived) return false;

        // Floor Filter
        if (floorFilter !== "all") {
             if (room.floor === null || room.floor === undefined) return false;
             if (room.floor.toString() !== floorFilter) return false;
        }

        if (!searchQuery) return true;

        const query = searchQuery.toLowerCase().trim();
        
        // Exact matching for floor (usually numeric)
        if (room.floor && room.floor.toString().toLowerCase() === query) return true;

        // Smart matching for Room Number / Name
        const name = room.name ? room.name.toLowerCase() : "";
        const unitId = room.unitId ? room.unitId.toLowerCase() : "";
        
        // Category Search
        const category = getRoomCategory(room.categoryId);
        const categoryName = category ? category.name.toLowerCase() : "";
        
        return name.includes(query) || unitId.includes(query) || categoryName.includes(query);
    });

    const activeRoomsCount = rooms.filter(r => !r.archived).length;
    const archivedRoomsCount = rooms.filter(r => r.archived).length;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-background p-1 rounded-lg">
                <div className="flex flex-1 gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0 items-center">
                    <div className="relative flex-1 max-w-sm min-w-[200px]">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search room, floor or category..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 h-10 bg-background text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                    </div>
                     <Select value={floorFilter} onValueChange={setFloorFilter}>
                        <SelectTrigger className="w-[140px] h-10">
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
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    {!showArchived && (
                        <Button variant="outline" onClick={onManageCategories} size="sm" className="hidden sm:flex h-10 text-sm">
                            <Layers size={16} className="mr-2" />
                            Manage Categories
                        </Button>
                    )}
                    {!showArchived && (
                        <Button onClick={onCreateRoom} size="sm" className="h-10 text-sm bg-primary text-primary-foreground shadow-sm">
                            <Plus size={16} className="mr-2" />
                            Create Unit
                        </Button>
                    )}
                    <Button
                        variant={showArchived ? "default" : "outline"}
                        onClick={() => setShowArchived(!showArchived)}
                        size="sm"
                        className="h-10 text-sm w-[160px] justify-start"
                    >
                         {showArchived ? (
                            <><RotateCcw size={16} className="mr-2" />Show Active ({activeRoomsCount})</>
                        ) : (
                            <><Archive size={16} className="mr-2" />Show Archive ({archivedRoomsCount})</>
                        )}
                    </Button>
                </div>
            </div>

            <Card className="border-border shadow-sm  overflow-hidden">
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table className="w-full table-fixed">
                            <TableHeader>
                                <TableRow className="bg-muted/50 hover:bg-muted/50 border-border">
                                    <TableHead className="px-4 py-3 align-middle font-medium text-muted-foreground w-[20%] text-left">Room Number</TableHead>
                                    <TableHead className="px-4 py-3 align-middle font-medium text-muted-foreground w-[20%] text-left">Category</TableHead>
                                    <TableHead className="px-4 py-3 align-middle font-medium text-muted-foreground w-[20%] text-left">Sub-category</TableHead>
                                    <TableHead className="px-4 py-3 align-middle font-medium text-muted-foreground w-[20%] text-left">Floor</TableHead>
                                    <TableHead className="px-4 py-3 align-middle font-medium text-muted-foreground w-[20%] text-center">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredRooms.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-32 text-center text-muted-foreground text-sm">
                                            {showArchived ? "No archived room units yet" : "No room units match your search."}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredRooms.map((room) => {
                                        const category = getRoomCategory(room.categoryId);
                                        return (
                                            <TableRow
                                                key={room.id}
                                                className="hover:bg-muted/5 transition-colors cursor-pointer border-b border-border last:border-0"
                                                onClick={() => handleRowClick(room)}
                                            >
                                                <TableCell className="px-4 py-3 align-middle text-sm font-medium text-foreground text-left w-[20%]">
                                                    <div className="flex flex-col">
                                                        <span>{room.name || "—"}</span>
                                                        <span className="text-xs text-muted-foreground font-normal">#{room.unitId}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="px-4 py-3 align-middle text-left text-sm text-foreground w-[20%]">
                                                    <div className="flex items-center justify-start gap-2">
                                                        {category?.name || "—"}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="px-4 py-3 align-middle text-left text-sm text-muted-foreground w-[20%]">
                                                    {category?.subCategory || "—"}
                                                </TableCell>
                                                <TableCell className="px-4 py-3 align-middle text-left text-sm text-muted-foreground w-[20%]">
                                                    <div className="flex items-center justify-start gap-2">
                                                        {room.floor}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="px-4 py-3 align-middle text-center w-[20%]">
                                                    <div className="flex items-center justify-center">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onArchiveRoom?.(room.id);
                                                            }}
                                                            className={`h-8 w-8 rounded-full ${room.archived ? 'text-primary hover:bg-primary/10' : 'text-muted-foreground hover:text-destructive hover:bg-destructive/10'}`}
                                                            title={room.archived ? 'Restore' : 'Archive'}
                                                        >
                                                            {room.archived ? <RotateCcw size={14} /> : <Archive size={14} />}
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                    {/* Pagination Mock */}
                    <div className="p-4 border-t border-border bg-muted/5 flex items-center justify-between">
                         <div className="text-xs text-muted-foreground font-medium">
                            Showing {filteredRooms.length} rooms
                        </div>
                    </div>
                </CardContent>
            </Card>

            <RoomDetailsModal
                open={isDetailsModalOpen}
                onOpenChange={setIsDetailsModalOpen}
                room={selectedRoomForDetails}
                roomCategories={roomCategories}
                onEdit={handleEditFromDetails}
            />
        </div>
    );
}
