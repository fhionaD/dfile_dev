import { useState } from "react";
import { DoorOpen, Users, Layers, Building2, Plus, Search, Filter, Archive, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Room } from "@/types/asset";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";

interface RoomListViewProps {
    rooms: Room[];
    roomCategories: { id: string; name: string }[];
    onCreateRoom: () => void;
    onManageCategories: () => void;
    onRoomClick?: (room: Room) => void;
    onArchiveRoom?: (id: string) => void;
}

export function RoomListView({ rooms, roomCategories, onCreateRoom, onManageCategories, onRoomClick, onArchiveRoom }: RoomListViewProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [showArchived, setShowArchived] = useState(false);

    const getCategoryName = (id: string) => roomCategories.find(c => c.id === id)?.name || id;

    const filteredRooms = rooms.filter(room => {
        // Archive Status
        if (showArchived !== !!room.archived) return false;

        // Text Search (Unit ID or Floor)
        const query = searchQuery.toLowerCase();
        const matchesSearch = room.unitId.toLowerCase().includes(query) || room.floor.toLowerCase().includes(query);
        if (!matchesSearch) return false;

        // Status Filter
        if (statusFilter !== "All" && room.status !== statusFilter) return false;

        return true;
    });

    const activeRoomsCount = rooms.filter(r => !r.archived).length;
    const archivedRoomsCount = rooms.filter(r => r.archived).length;

    return (
        <div className="space-y-6">
            <Card className="border-border">
                {/* Header */}
                <div className="p-6 border-b border-border bg-muted/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-primary/10 rounded-lg text-primary">
                            <Building2 size={18} />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-foreground">Room Units</h3>
                            <p className="text-xs text-muted-foreground mt-0.5">Manage building floors and room occupancy</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={onManageCategories} size="sm" className="rounded-xl h-8 text-xs hidden sm:flex">
                            <Layers size={14} className="mr-2" />
                            Manage Categories
                        </Button>
                        <Button onClick={onCreateRoom} size="sm" className="rounded-xl h-8 text-xs bg-primary text-primary-foreground shadow-sm">
                            <Plus size={14} className="mr-2" />
                            Create Unit
                        </Button>
                    </div>
                </div>

                {/* Filters */}
                <div className="p-4 border-b border-border bg-muted/20 flex flex-col sm:flex-row gap-3 justify-between">
                    <div className="flex flex-1 gap-3">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search unit ID or floor..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 h-9 bg-background"
                            />
                        </div>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[180px] h-9 bg-background">
                                <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="All">All Status</SelectItem>
                                <SelectItem value="Available">Available</SelectItem>
                                <SelectItem value="Occupied">Occupied</SelectItem>
                                <SelectItem value="Maintenance">Maintenance</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <Button
                        variant={showArchived ? "default" : "outline"}
                        size="sm"
                        className="text-xs font-medium h-9"
                        onClick={() => setShowArchived(!showArchived)}
                    >
                        {showArchived ? (
                            <><RotateCcw size={14} className="mr-1.5" /> Active ({activeRoomsCount})</>
                        ) : (
                            <><Archive size={14} className="mr-1.5" /> Archived ({archivedRoomsCount})</>
                        )}
                    </Button>
                </div>

                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50 hover:bg-muted/50 border-border">
                                <TableHead className="w-[150px] text-center"><div className="flex items-center justify-center gap-2 text-xs font-medium text-muted-foreground"><DoorOpen size={14} /> Unit ID</div></TableHead>
                                <TableHead className="w-[120px] text-xs font-medium text-muted-foreground">Status</TableHead>
                                <TableHead><div className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><Layers size={14} /> Category</div></TableHead>
                                <TableHead><div className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><Building2 size={14} /> Floor</div></TableHead>
                                <TableHead><div className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><Users size={14} /> Occupancy</div></TableHead>
                                <TableHead className="w-[80px] text-xs font-medium text-center">{showArchived ? "Restore" : "Archive"}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredRooms.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground text-sm">
                                        No room units match your search.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredRooms.map((room) => (
                                    <TableRow
                                        key={room.id}
                                        className="border-border hover:bg-muted/30 transition-colors cursor-pointer"
                                        onClick={() => onRoomClick?.(room)}
                                    >
                                        <TableCell className="font-mono text-sm font-medium text-foreground text-center">{room.unitId}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={`${room.status === "Available" ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20" : "bg-muted text-muted-foreground border-border"} rounded-md text-xs font-medium`}>
                                                {room.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-sm text-foreground">{getCategoryName(room.categoryId)}</TableCell>
                                        <TableCell className="text-sm text-muted-foreground">{room.floor}</TableCell>
                                        <TableCell className="text-sm text-muted-foreground">{room.maxOccupancy} Person(s)</TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex items-center justify-center">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onArchiveRoom?.(room.id);
                                                    }}
                                                    className={`p-1.5 rounded-md transition-colors ${room.archived ? 'text-primary hover:bg-primary/10' : 'text-muted-foreground hover:text-destructive hover:bg-destructive/10'}`}
                                                    title={room.archived ? 'Restore' : 'Archive'}
                                                >
                                                    {room.archived ? <RotateCcw size={16} /> : <Archive size={16} />}
                                                </button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </Card>
        </div>
    );
}
