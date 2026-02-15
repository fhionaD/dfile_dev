"use client";

import { useState } from "react";
import { Search, ArrowRight, CheckCircle2, Building2, Package, Calendar as CalendarIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Asset, Room } from "@/types/asset";

interface AssetAllocationViewProps {
    assets: Asset[];
    rooms: Room[];
    onAllocate: (assetId: string, roomId: string) => void;
}

export function AssetAllocationView({ assets, rooms, onAllocate }: AssetAllocationViewProps) {
    const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
    const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterCategory, setFilterCategory] = useState<string>("all");
    const [dateFilter, setDateFilter] = useState<string>("All Time");
    const [roomSearchTerm, setRoomSearchTerm] = useState("");

    // Filter available assets
    const availableAssets = assets.filter(
        (a) => {
            if (a.status !== "Available") return false;

            // Text Search
            const matchesSearch = a.desc.toLowerCase().includes(searchTerm.toLowerCase()) ||
                a.id.toLowerCase().includes(searchTerm.toLowerCase());
            if (!matchesSearch) return false;

            // Category Filter
            if (filterCategory !== "all" && a.cat !== filterCategory) return false;

            // Date Filter
            if (dateFilter !== "All Time") {
                if (!a.purchaseDate) return false;
                const date = new Date(a.purchaseDate);
                const now = new Date();

                if (dateFilter === "This Month") {
                    if (date.getMonth() !== now.getMonth() || date.getFullYear() !== now.getFullYear()) return false;
                }
                if (dateFilter === "This Year") {
                    if (date.getFullYear() !== now.getFullYear()) return false;
                }
            }

            return true;
        }
    );

    // Filter rooms
    const filteredRooms = rooms.filter(r =>
        r.unitId.toLowerCase().includes(roomSearchTerm.toLowerCase()) ||
        r.floor.toString().includes(roomSearchTerm)
    );

    const categories = Array.from(new Set(assets.map(a => a.cat)));
    const selectedAsset = assets.find(a => a.id === selectedAssetId);
    // const selectedRoom = rooms.find(r => r.unitId === selectedRoomId); // Unused

    const handleConfirmAllocation = () => {
        if (selectedAssetId && selectedRoomId) {
            onAllocate(selectedAssetId, selectedRoomId);
            setSelectedAssetId(null);
            setSelectedRoomId(null);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 lg:h-[calc(100vh-12rem)]">
            {/* Left Panel: Available Assets */}
            <Card className="lg:col-span-2 flex flex-col h-full border-border/50 shadow-sm">
                <CardHeader className="p-6 border-b border-border/50 bg-muted/40 uppercase tracking-wider">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                <Package size={18} />
                            </div>
                            <div>
                                <CardTitle className="text-lg font-semibold text-foreground">Asset Inventory</CardTitle>
                                <CardDescription className="text-xs text-muted-foreground">Select an available asset</CardDescription>
                            </div>
                        </div>
                        <Badge variant="outline" className="bg-background">{availableAssets.length} Available</Badge>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 mt-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by name or ID..."
                                className="pl-9 h-9 bg-background"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2">
                            <Select value={filterCategory} onValueChange={setFilterCategory}>
                                <SelectTrigger className="w-full sm:w-[200px] h-9 bg-background">
                                    <SelectValue placeholder="Category" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Categories</SelectItem>
                                    {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <Select value={dateFilter} onValueChange={setDateFilter}>
                                <SelectTrigger className="w-full sm:w-[180px] h-9 bg-background">
                                    <CalendarIcon className="w-4 h-4 mr-2 text-muted-foreground" />
                                    <SelectValue placeholder="Period" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="All Time">All Time</SelectItem>
                                    <SelectItem value="This Month">This Month</SelectItem>
                                    <SelectItem value="This Year">This Year</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto p-0">
                    {availableAssets.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                            <Package className="h-10 w-10 mb-2 opacity-20" />
                            <p className="text-sm">No available assets found</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-border/50">
                            {availableAssets.map((asset) => (
                                <div
                                    key={asset.id}
                                    onClick={() => setSelectedAssetId(asset.id)}
                                    className={`p-4 flex items-center justify-between cursor-pointer transition-colors hover:bg-muted/30 ${selectedAssetId === asset.id ? "bg-primary/5 border-l-4 border-primary" : "border-l-4 border-transparent"}`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                                            {asset.image ? (
                                                <img src={asset.image} alt="" className="h-full w-full object-cover rounded-lg" />
                                            ) : (
                                                <Package size={18} className="text-muted-foreground" />
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-medium text-sm text-foreground">{asset.desc}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 rounded">{asset.id}</span>
                                                <span className="text-xs text-muted-foreground">• {asset.cat}</span>
                                            </div>
                                        </div>
                                    </div>
                                    {selectedAssetId === asset.id && <CheckCircle2 className="text-primary h-5 w-5" />}
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Right Panel: Allocation Action */}
            <div className="flex flex-col gap-6 h-full">
                {/* Target Room Selection */}
                <Card className="flex-1 border-border/50 shadow-sm flex flex-col">
                    <CardHeader className="p-6 border-b border-border/50 bg-muted/40">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                <Building2 size={18} />
                            </div>
                            <div>
                                <CardTitle className="text-lg font-semibold text-foreground">Target Location</CardTitle>
                                <CardDescription className="text-xs text-muted-foreground">Select destination room unit</CardDescription>
                            </div>
                        </div>
                        <div className="relative mt-2">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search room..."
                                className="pl-9 h-9 bg-background"
                                value={roomSearchTerm}
                                onChange={(e) => setRoomSearchTerm(e.target.value)}
                            />
                        </div>
                    </CardHeader>
                    <CardContent className="p-4 flex-1 overflow-y-auto">
                        <div className="space-y-2">
                            {filteredRooms.map((room) => (
                                <div
                                    key={room.id}
                                    onClick={() => setSelectedRoomId(room.unitId)}
                                    className={`p-3 rounded-xl border cursor-pointer transition-all ${selectedRoomId === room.unitId ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:border-primary/50"}`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                                                <Building2 size={14} />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-sm">{room.unitId}</p>
                                                <p className="text-xs text-muted-foreground">{room.floor}</p>
                                            </div>
                                        </div>
                                        {selectedRoomId === room.unitId && <div className="h-2 w-2 rounded-full bg-primary" />}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Confirmation Box */}
                <Card className="border-border/50 shadow-sm bg-muted/20">
                    <CardContent className="p-6 space-y-4">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Selected Asset:</span>
                            <span className="font-medium truncate max-w-[150px]">{selectedAsset?.desc || "—"}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Target Room:</span>
                            <span className="font-medium">{selectedRoomId || "—"}</span>
                        </div>

                        <div className="pt-2">
                            <Button
                                className="w-full rounded-xl"
                                size="lg"
                                disabled={!selectedAssetId || !selectedRoomId}
                                onClick={handleConfirmAllocation}
                            >
                                Confirm Allocation <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
