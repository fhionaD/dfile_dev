"use client";

import { useState, useMemo } from "react";
import {
    Search, ArrowRightLeft, CheckCircle2, Package, DoorOpen, X,
    ChevronRight, MapPin, Layers, Tag, AlertCircle, RotateCcw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Asset, Room } from "@/types/asset";

// ─── Helpers ─────────────────────────────────────────────────────
function statusLabel(asset: Asset) {
    return asset.status || "Unknown";
}

function statusBadgeVariant(label: string): "default" | "secondary" | "outline" | "destructive" {
    if (label === "Available") return "default";
    if (label === "In Use") return "secondary";
    if (label === "Under Maintenance") return "outline";
    return "destructive";
}

function roomCategoryLabel(room: Room) {
    if (!room.categoryName) return null;
    return room.subCategoryName ? `${room.categoryName} — ${room.subCategoryName}` : room.categoryName;
}

// ─── Sub-components ───────────────────────────────────────────────
function AssetRow({ asset, selected, onClick }: { asset: Asset; selected: boolean; onClick: () => void }) {
    const label = statusLabel(asset);
    return (
        <button
            type="button"
            onClick={onClick}
            className={`w-full text-left rounded-lg border p-3 transition-all ${selected
                ? "border-primary bg-primary/5 ring-1 ring-primary"
                : "border-border hover:border-primary/40 hover:bg-muted/30"
                }`}
        >
            <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{asset.desc}</p>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">{asset.tagNumber || asset.assetCode}</p>
                    {asset.categoryName && <p className="text-xs text-muted-foreground truncate">{asset.categoryName}</p>}
                </div>
                <Badge variant={statusBadgeVariant(label)} className="text-[10px] shrink-0">{label}</Badge>
            </div>
        </button>
    );
}

function RoomRow({ room, selected, assetCount, onClick }: { room: Room; selected: boolean; assetCount: number; onClick: () => void }) {
    const catLabel = roomCategoryLabel(room);
    return (
        <button
            type="button"
            onClick={onClick}
            className={`w-full text-left rounded-lg border p-3 transition-all ${selected
                ? "border-primary bg-primary/5 ring-1 ring-primary"
                : "border-border hover:border-primary/40 hover:bg-muted/30"
                }`}
        >
            <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">{room.name}</span>
                        <span className="text-xs font-mono text-muted-foreground">{room.unitId}</span>
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                        <span>Floor {room.floor}</span>
                        {catLabel && <><span className="text-muted-foreground/30">·</span><span className="truncate max-w-[140px]">{catLabel}</span></>}
                    </div>
                </div>
                {assetCount > 0 && (
                    <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
                        {assetCount} asset{assetCount !== 1 ? "s" : ""}
                    </span>
                )}
            </div>
        </button>
    );
}

// ─── Main component ───────────────────────────────────────────────
interface AssetAllocationViewProps {
    assets: Asset[];
    rooms: Room[];
    onAllocate: (assetId: string, roomId: string, remarks?: string) => void;
    onDeallocate: (assetId: string) => void;
    isPending?: boolean;
}

export function AssetAllocationView({ assets, rooms, onAllocate, onDeallocate, isPending }: AssetAllocationViewProps) {
    const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
    const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
    const [assetSearch, setAssetSearch] = useState("");
    const [assetCatFilter, setAssetCatFilter] = useState("all");
    const [roomSearch, setRoomSearch] = useState("");
    const [roomFloorFilter, setRoomFloorFilter] = useState("all");
    const [remarks, setRemarks] = useState("");

    const availableAssets = useMemo(() => assets.filter(a => !a.isArchived && a.allocationState === 'Unallocated' && a.status !== 'Disposed' && a.status !== 'Archived'), [assets]);
    const allocatedAssets = useMemo(() => assets.filter(a => !a.isArchived && a.allocationState === 'Allocated'), [assets]);
    const activeRooms = useMemo(() => rooms.filter(r => !r.isArchived), [rooms]);

    const assetCountByRoom = useMemo(() => {
        const map: Record<string, number> = {};
        allocatedAssets.forEach(a => {
            const rc = a.roomCode;
            if (rc) map[rc] = (map[rc] ?? 0) + 1;
        });
        return map;
    }, [allocatedAssets]);

    const categoryOptions = useMemo(() =>
        Array.from(new Set(availableAssets.map(a => a.categoryName).filter(Boolean) as string[])).sort()
        , [availableAssets]);

    const floorOptions = useMemo(() =>
        Array.from(new Set(activeRooms.map(r => r.floor).filter(Boolean))).sort((a, b) => Number(a) - Number(b))
        , [activeRooms]);

    const filteredAssets = useMemo(() => {
        let list = availableAssets;
        if (assetSearch) {
            const q = assetSearch.toLowerCase();
            list = list.filter(a => a.desc.toLowerCase().includes(q) || a.tagNumber?.toLowerCase().includes(q) || a.assetCode?.toLowerCase().includes(q));
        }
        if (assetCatFilter !== "all") list = list.filter(a => a.categoryName === assetCatFilter);
        return list;
    }, [availableAssets, assetSearch, assetCatFilter]);

    const filteredRooms = useMemo(() => {
        let list = activeRooms;
        if (roomSearch) {
            const q = roomSearch.toLowerCase();
            list = list.filter(r => r.name.toLowerCase().includes(q) || r.unitId.toLowerCase().includes(q));
        }
        if (roomFloorFilter !== "all") list = list.filter(r => r.floor === roomFloorFilter);
        return list;
    }, [activeRooms, roomSearch, roomFloorFilter]);

    const handleConfirm = () => {
        if (!selectedAsset || !selectedRoom) return;
        onAllocate(selectedAsset.id, selectedRoom.id, remarks.trim() || undefined);
        setSelectedAsset(null);
        setSelectedRoom(null);
        setRemarks("");
    };

    const canConfirm = !!selectedAsset && !!selectedRoom && !isPending;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <ArrowRightLeft className="h-5 w-5 text-primary" />
                </div>
                <div>
                    <h1 className="text-xl font-semibold tracking-tight">Asset Allocation</h1>
                    <p className="text-sm text-muted-foreground">Assign available assets to designated room units</p>
                </div>
            </div>

            <Tabs defaultValue="allocate">
                <TabsList className="grid w-full grid-cols-2 max-w-xs">
                    <TabsTrigger value="allocate" className="gap-1.5 text-xs">
                        <ChevronRight className="h-3.5 w-3.5" />Allocate
                    </TabsTrigger>
                    <TabsTrigger value="allocated" className="gap-1.5 text-xs">
                        <Package className="h-3.5 w-3.5" />
                        Allocated
                        {allocatedAssets.length > 0 && (
                            <span className="ml-1 bg-primary/10 text-primary rounded-full px-1.5 text-[10px] font-semibold">{allocatedAssets.length}</span>
                        )}
                    </TabsTrigger>
                </TabsList>

                {/* ═══ ALLOCATE TAB ═══ */}
                <TabsContent value="allocate" className="mt-4">
                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px_1fr] gap-4 items-start">

                        {/* LEFT — Available Assets */}
                        <div className="space-y-3">
                            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                <Tag className="h-3.5 w-3.5" />Step 1 — Select Asset
                                <span className="text-muted-foreground/60 font-normal normal-case">({filteredAssets.length})</span>
                            </h2>
                            <div className="space-y-1.5">
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                    <Input placeholder="Search by name or tag..." value={assetSearch} onChange={e => setAssetSearch(e.target.value)} className="pl-8 h-8 text-sm" />
                                </div>
                                {categoryOptions.length > 0 && (
                                    <select value={assetCatFilter} onChange={e => setAssetCatFilter(e.target.value)} className="w-full h-8 rounded-md border border-input bg-background px-3 text-xs text-muted-foreground focus:outline-none">
                                        <option value="all">All categories</option>
                                        {categoryOptions.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                )}
                            </div>
                            <div className="space-y-1.5 max-h-[480px] overflow-y-auto pr-0.5">
                                {filteredAssets.length === 0 ? (
                                    <div className="text-center py-10 text-muted-foreground rounded-lg border border-dashed">
                                        <Package className="h-8 w-8 mx-auto mb-2 opacity-20" />
                                        <p className="text-xs">No available assets</p>
                                    </div>
                                ) : filteredAssets.map(a => (
                                    <AssetRow key={a.id} asset={a} selected={selectedAsset?.id === a.id} onClick={() => setSelectedAsset(prev => prev?.id === a.id ? null : a)} />
                                ))}
                            </div>
                        </div>

                        {/* CENTER — Allocation Summary */}
                        <div className="space-y-3">
                            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 lg:justify-center">
                                <CheckCircle2 className="h-3.5 w-3.5" />Step 2 — Confirm
                            </h2>

                            {!selectedAsset && !selectedRoom ? (
                                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center gap-2 min-h-[180px]">
                                    <ArrowRightLeft className="h-7 w-7 text-muted-foreground/25" />
                                    <p className="text-xs text-muted-foreground">Select an asset then a room unit</p>
                                </div>
                            ) : (
                                <div className="space-y-2.5">
                                    {/* Asset box */}
                                    <div className={`rounded-lg border p-2.5 ${selectedAsset ? "border-primary/30 bg-primary/5" : "border-dashed opacity-50"}`}>
                                        <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-semibold mb-1">Asset</p>
                                        {selectedAsset ? (
                                            <>
                                                <p className="text-sm font-semibold text-foreground truncate">{selectedAsset.desc}</p>
                                                <p className="text-xs text-muted-foreground font-mono">{selectedAsset.tagNumber || selectedAsset.assetCode}</p>
                                                {selectedAsset.categoryName && <p className="text-xs text-muted-foreground">{selectedAsset.categoryName}</p>}
                                            </>
                                        ) : <p className="text-xs text-muted-foreground italic">← Select an asset</p>}
                                    </div>

                                    <div className="flex justify-center"><ChevronRight className="h-4 w-4 text-muted-foreground rotate-90 lg:rotate-0" /></div>

                                    {/* Room box */}
                                    <div className={`rounded-lg border p-2.5 ${selectedRoom ? "border-primary/30 bg-primary/5" : "border-dashed opacity-50"}`}>
                                        <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-semibold mb-1">Room Unit</p>
                                        {selectedRoom ? (
                                            <>
                                                <p className="text-sm font-semibold text-foreground">{selectedRoom.name} <span className="font-mono text-xs text-muted-foreground">{selectedRoom.unitId}</span></p>
                                                <p className="text-xs text-muted-foreground">Floor {selectedRoom.floor}</p>
                                                {roomCategoryLabel(selectedRoom) && <p className="text-xs text-muted-foreground truncate">{roomCategoryLabel(selectedRoom)}</p>}
                                            </>
                                        ) : <p className="text-xs text-muted-foreground italic">Select a room →</p>}
                                    </div>

                                    {/* Remarks */}
                                    <div>
                                        <Label className="text-[9px] uppercase tracking-widest text-muted-foreground font-semibold">Remarks (optional)</Label>
                                        <Textarea value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Add notes..." className="text-xs mt-1 min-h-[56px] resize-none" maxLength={500} />
                                    </div>

                                    {/* Validation hints */}
                                    {!selectedAsset && <p className="text-xs text-amber-600 flex items-center gap-1"><AlertCircle className="h-3 w-3 shrink-0" />Select an asset first</p>}
                                    {selectedAsset && !selectedRoom && <p className="text-xs text-amber-600 flex items-center gap-1"><AlertCircle className="h-3 w-3 shrink-0" />Now select a room unit</p>}

                                    <Button className="w-full" disabled={!canConfirm} onClick={handleConfirm}>
                                        {isPending ? "Allocating..." : "Confirm Allocation"}
                                    </Button>
                                    <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => { setSelectedAsset(null); setSelectedRoom(null); setRemarks(""); }}>
                                        <X className="h-3 w-3 mr-1" />Clear selection
                                    </Button>
                                </div>
                            )}
                        </div>

                        {/* RIGHT — Room Units */}
                        <div className="space-y-3">
                            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                <DoorOpen className="h-3.5 w-3.5" />Step 3 — Select Room
                                <span className="text-muted-foreground/60 font-normal normal-case">({filteredRooms.length})</span>
                            </h2>
                            <div className="space-y-1.5">
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                    <Input placeholder="Search by name or code..." value={roomSearch} onChange={e => setRoomSearch(e.target.value)} className="pl-8 h-8 text-sm" />
                                </div>
                                {floorOptions.length > 0 && (
                                    <select value={roomFloorFilter} onChange={e => setRoomFloorFilter(e.target.value)} className="w-full h-8 rounded-md border border-input bg-background px-3 text-xs text-muted-foreground focus:outline-none">
                                        <option value="all">All floors</option>
                                        {floorOptions.map(f => <option key={f} value={f}>Floor {f}</option>)}
                                    </select>
                                )}
                            </div>
                            <div className="space-y-1.5 max-h-[480px] overflow-y-auto pr-0.5">
                                {filteredRooms.length === 0 ? (
                                    <div className="text-center py-10 text-muted-foreground rounded-lg border border-dashed">
                                        <DoorOpen className="h-8 w-8 mx-auto mb-2 opacity-20" />
                                        <p className="text-xs">No room units found</p>
                                    </div>
                                ) : filteredRooms.map(r => (
                                    <RoomRow key={r.id} room={r} selected={selectedRoom?.id === r.id} assetCount={assetCountByRoom[r.unitId] ?? 0} onClick={() => setSelectedRoom(prev => prev?.id === r.id ? null : r)} />
                                ))}
                            </div>
                        </div>
                    </div>
                </TabsContent>

                {/* ═══ ALLOCATED TAB ═══ */}
                <TabsContent value="allocated" className="mt-4">
                    <div className="space-y-3">
                        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5" />Currently Allocated
                            <span className="font-normal normal-case text-muted-foreground/60">({allocatedAssets.length})</span>
                        </h2>
                        {allocatedAssets.length === 0 ? (
                            <div className="text-center py-16 text-muted-foreground rounded-lg border border-dashed">
                                <Layers className="h-10 w-10 mx-auto mb-3 opacity-20" />
                                <p className="text-sm">No assets are currently allocated</p>
                            </div>
                        ) : (
                            <div className="rounded-md border overflow-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b bg-muted/30">
                                            <th className="text-left p-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Asset</th>
                                            <th className="text-left p-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Tag / Code</th>
                                            <th className="text-left p-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Category</th>
                                            <th className="text-left p-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Room Unit</th>
                                            <th className="text-center p-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {allocatedAssets.map(asset => {
                                            return (
                                                <tr key={asset.id} className="border-b last:border-0 hover:bg-muted/20">
                                                    <td className="p-3 font-medium max-w-[200px]"><p className="truncate">{asset.desc}</p></td>
                                                    <td className="p-3 text-xs font-mono text-muted-foreground">{asset.tagNumber || asset.assetCode || "—"}</td>
                                                    <td className="p-3 text-xs text-muted-foreground max-w-[150px]"><span className="truncate block">{asset.categoryName || "—"}</span></td>
                                                    <td className="p-3">
                                                        {asset.roomCode ? (
                                                            <div>
                                                                <span className="font-mono text-xs text-foreground">{asset.roomCode}</span>
                                                                {asset.roomName && <span className="text-xs text-muted-foreground ml-1">({asset.roomName})</span>}
                                                            </div>
                                                        ) : "—"}
                                                    </td>
                                                    <td className="p-3 text-center">
                                                        <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:bg-destructive/10 gap-1" onClick={() => onDeallocate(asset.id)} disabled={isPending}>
                                                            <RotateCcw className="h-3 w-3" />Deallocate
                                                        </Button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
