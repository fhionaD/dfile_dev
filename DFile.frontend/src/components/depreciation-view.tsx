"use client";

import { useState, useMemo } from "react";
import { Building2, Download, Package, RefreshCw, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAssets } from "@/hooks/use-assets";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { CurrencyCell } from "@/components/ui/currency-cell";
import { CurrencyHeader } from "@/components/ui/currency-header";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Asset } from "@/types/asset";
import { cn } from "@/lib/utils";

interface DepreciationViewProps {
    onAssetClick?: (asset: Asset) => void;
}

function calculateAssetDepreciation(asset: Asset) {
    const cost = asset.purchasePrice ?? asset.value ?? 0;
    const usefulLifeYears = asset.usefulLifeYears ?? 5;
    const purchaseDate = asset.purchaseDate ? new Date(asset.purchaseDate) : new Date();
    const now = new Date();

    const ageInMonths = (now.getFullYear() - purchaseDate.getFullYear()) * 12 + (now.getMonth() - purchaseDate.getMonth());
    const totalLifeMonths = usefulLifeYears * 12;

    const monthlyDepreciation = usefulLifeYears > 0 ? cost / totalLifeMonths : 0;

    const accumulatedDepreciation = Math.min(cost, monthlyDepreciation * ageInMonths);

    const currentBookValue = Math.max(0, cost - accumulatedDepreciation);

    const remainingMonths = Math.max(0, totalLifeMonths - ageInMonths);
    const remainingYears = (remainingMonths / 12).toFixed(1);

    const endDate = new Date(purchaseDate);
    endDate.setMonth(endDate.getMonth() + totalLifeMonths);

    const isFullyDepreciated = currentBookValue === 0;
    const isNearEndOfLife = !isFullyDepreciated && remainingMonths <= 6;
    const isLowValue = currentBookValue > 0 && currentBookValue < (cost * 0.1);

    return {
        cost,
        usefulLifeYears,
        ageInMonths,
        monthlyDepreciation,
        accumulatedDepreciation,
        currentBookValue,
        remainingMonths,
        remainingYears,
        endDate,
        isFullyDepreciated,
        isNearEndOfLife,
        isLowValue,
    };
}

export function DepreciationView({ onAssetClick }: DepreciationViewProps) {
    const { data: assets = [], isLoading } = useAssets();
    const [viewMode, setViewMode] = useState<"assets" | "rooms">("assets");
    const [searchQuery, setSearchQuery] = useState("");
    const [roomFilter, setRoomFilter] = useState("All");
    const [categoryFilter, setCategoryFilter] = useState("All");
    const [statusFilter, setStatusFilter] = useState("Active");

    const processedAssets = useMemo(() => {
        return assets.map((asset) => {
            const depDetails = calculateAssetDepreciation(asset);
            return { ...asset, ...depDetails };
        });
    }, [assets]);

    const filteredAssets = useMemo(() => {
        return processedAssets.filter((asset) => {
            if (statusFilter === "Active" && (asset.status === "Archived" || asset.status === "Disposed")) return false;
            if (statusFilter === "Archived" && asset.status !== "Archived" && asset.status !== "Disposed") return false;
            if (statusFilter === "Fully Depreciated" && !asset.isFullyDepreciated) return false;
            if (statusFilter === "Near End-of-Life" && !asset.isNearEndOfLife) return false;

            if (roomFilter !== "All" && (asset.room || "Unassigned") !== roomFilter) return false;
            if (categoryFilter !== "All" && asset.categoryName !== categoryFilter) return false;

            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const code = (asset.assetCode ?? "").toLowerCase();
                return asset.desc.toLowerCase().includes(q) ||
                    asset.id.toLowerCase().includes(q) ||
                    code.includes(q) ||
                    (asset.room || "").toLowerCase().includes(q);
            }

            return true;
        });
    }, [processedAssets, statusFilter, roomFilter, categoryFilter, searchQuery]);

    const roomDepreciationData = useMemo(() => {
        const rooms: Record<string, {
            name: string;
            totalAssets: number;
            totalCost: number;
            totalBookValue: number;
            monthlyDepreciation: number;
            fullyDepreciatedCount: number;
        }> = {};

        processedAssets.forEach((asset) => {
            if (asset.status === "Archived" || asset.status === "Disposed") return;

            const roomName = asset.room || "Unassigned";
            if (!rooms[roomName]) {
                rooms[roomName] = {
                    name: roomName,
                    totalAssets: 0,
                    totalCost: 0,
                    totalBookValue: 0,
                    monthlyDepreciation: 0,
                    fullyDepreciatedCount: 0,
                };
            }

            rooms[roomName].totalAssets++;
            rooms[roomName].totalCost += asset.cost;
            rooms[roomName].totalBookValue += asset.currentBookValue;
            rooms[roomName].monthlyDepreciation += asset.monthlyDepreciation;
            if (asset.isFullyDepreciated) rooms[roomName].fullyDepreciatedCount++;
        });

        return Object.values(rooms).sort((a, b) => b.totalBookValue - a.totalBookValue);
    }, [processedAssets]);

    const uniqueRooms = useMemo(
        () => Array.from(new Set(assets.map((a) => a.room || "Unassigned").filter(Boolean))).sort(),
        [assets],
    );
    const uniqueCategories = useMemo(
        () => Array.from(new Set(assets.map((a) => a.categoryName).filter((v): v is string => Boolean(v)))),
        [assets],
    );

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="flex flex-wrap gap-3">
                    <Skeleton className="h-10 w-64" />
                    <Skeleton className="h-10 w-[170px]" />
                    <Skeleton className="h-10 w-[170px]" />
                </div>
                <div className="rounded-md border overflow-hidden">
                    <div className="bg-muted/50 px-4 py-3 flex items-center gap-4">
                        {Array.from({ length: 10 }).map((_, i) => (
                            <Skeleton key={i} className="h-4 flex-1" />
                        ))}
                    </div>
                    <div className="divide-y divide-border">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className="px-4 py-3 flex items-center gap-4">
                                <Skeleton className="h-4 w-32" />
                                {Array.from({ length: 9 }).map((_, j) => (
                                    <Skeleton key={j} className="h-4 flex-1" />
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
                <div className="flex flex-1 flex-wrap gap-3 w-full lg:w-auto items-center">
                    <div className="relative flex-1 max-w-sm min-w-[220px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search name, code, ID, or room..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 h-10"
                        />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[170px] h-10">
                            <div className="flex items-center gap-2">
                                <Filter className="w-4 h-4 text-muted-foreground" />
                                <SelectValue />
                            </div>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="All">All Status</SelectItem>
                            <SelectItem value="Active">Active Assets</SelectItem>
                            <SelectItem value="Fully Depreciated">Fully Depreciated</SelectItem>
                            <SelectItem value="Near End-of-Life">Near End-of-Life</SelectItem>
                            <SelectItem value="Archived">Archived / Retired</SelectItem>
                        </SelectContent>
                    </Select>
                    {viewMode === "assets" && (
                        <Select value={roomFilter} onValueChange={setRoomFilter}>
                            <SelectTrigger className="w-[170px] h-10">
                                <div className="flex items-center gap-2">
                                    <Building2 className="w-4 h-4 text-muted-foreground" />
                                    <SelectValue placeholder="Room" />
                                </div>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="All">All Rooms</SelectItem>
                                {uniqueRooms.map((r) => (
                                    <SelectItem key={r} value={r}>{r}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                        <SelectTrigger className="w-[170px] h-10">
                            <div className="flex items-center gap-2">
                                <Package className="w-4 h-4 text-muted-foreground" />
                                <SelectValue placeholder="Category" />
                            </div>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="All">All Categories</SelectItem>
                            {uniqueCategories.map((c) => (
                                <SelectItem key={c} value={c}>{c}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
                    <div className="bg-muted/50 p-1 rounded-xl flex items-center h-11">
                        <Button
                            type="button"
                            variant={viewMode === "assets" ? "secondary" : "ghost"}
                            size="sm"
                            onClick={() => setViewMode("assets")}
                            className={cn("h-9 px-3 text-sm gap-1.5", viewMode === "assets" && "shadow-sm")}
                        >
                            <Package className="w-4 h-4" /> Assets
                        </Button>
                        <Button
                            type="button"
                            variant={viewMode === "rooms" ? "secondary" : "ghost"}
                            size="sm"
                            onClick={() => setViewMode("rooms")}
                            className={cn("h-9 px-3 text-sm gap-1.5", viewMode === "rooms" && "shadow-sm")}
                        >
                            <Building2 className="w-4 h-4" /> Rooms
                        </Button>
                    </div>
                    <Button variant="outline" size="sm" className="h-10 px-4 gap-2" type="button">
                        <Download className="w-4 h-4" /> Export
                    </Button>
                </div>
            </div>

            <div className="rounded-md border overflow-hidden">
                {viewMode === "assets" ? (
                    <div className="overflow-x-auto">
                        <Table className="w-full table-fixed">
                            <TableHeader>
                                <TableRow className="bg-muted/50 hover:bg-muted/50">
                                    <TableHead className="px-4 py-3 align-middle text-xs font-medium text-muted-foreground text-left w-[20%]">Asset Details</TableHead>
                                    <TableHead className="px-4 py-3 align-middle text-xs font-medium text-muted-foreground text-center w-[100px]">Purchased</TableHead>
                                    <CurrencyHeader className="w-[100px]">Cost Basis</CurrencyHeader>
                                    <TableHead className="px-4 py-3 align-middle text-xs font-medium text-muted-foreground text-center w-[80px]">Life (Yrs)</TableHead>
                                    <CurrencyHeader className="w-[120px]">Monthly Depr.</CurrencyHeader>
                                    <CurrencyHeader className="w-[120px]">Accum. Depr.</CurrencyHeader>
                                    <CurrencyHeader className="w-[120px]">Book Value</CurrencyHeader>
                                    <TableHead className="px-4 py-3 align-middle text-xs font-medium text-muted-foreground text-center w-[80px]">Remaining</TableHead>
                                    <TableHead className="px-4 py-3 align-middle text-xs font-medium text-muted-foreground text-center w-[100px]">End Date</TableHead>
                                    <TableHead className="px-4 py-3 align-middle text-xs font-medium text-muted-foreground text-center w-[140px]">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredAssets.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={10} className="h-32 text-center text-muted-foreground">
                                            No assets found matching filters.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredAssets.map((asset) => (
                                        <TableRow key={asset.id} className="hover:bg-muted/5 transition-colors cursor-pointer" onClick={() => onAssetClick?.(asset)}>
                                            <TableCell className="px-4 py-3 align-middle text-left">
                                                <div className="font-normal text-sm text-foreground truncate max-w-[200px]" title={asset.desc}>{asset.desc}</div>
                                                <div className="text-xs text-muted-foreground flex items-center gap-1 flex-wrap">
                                                    <span className="font-mono">{asset.assetCode || asset.id}</span>
                                                    <span className="text-muted-foreground/60">•</span>
                                                    <span>{asset.room || "Unassigned"}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="px-4 py-3 align-middle text-sm text-muted-foreground text-center whitespace-nowrap">{asset.purchaseDate ? new Date(asset.purchaseDate).toLocaleDateString() : "—"}</TableCell>
                                            <TableCell className="px-4 py-3 align-middle text-right text-sm font-normal">
                                                <CurrencyCell value={asset.cost} />
                                            </TableCell>
                                            <TableCell className="px-4 py-3 align-middle text-center text-sm text-muted-foreground">{asset.usefulLifeYears}</TableCell>
                                            <TableCell className="px-4 py-3 align-middle text-right text-sm">
                                                <CurrencyCell value={asset.monthlyDepreciation} />
                                            </TableCell>
                                            <TableCell className="px-4 py-3 align-middle text-right text-sm text-muted-foreground">
                                                <CurrencyCell value={asset.accumulatedDepreciation} className="text-muted-foreground" />
                                            </TableCell>
                                            <TableCell className="px-4 py-3 align-middle text-right text-sm font-normal text-foreground">
                                                <CurrencyCell value={asset.currentBookValue} />
                                            </TableCell>
                                            <TableCell className="px-4 py-3 align-middle text-center text-sm">
                                                <span className={cn("font-mono font-normal text-xs inline-flex", asset.isNearEndOfLife ? "text-red-600" : "text-muted-foreground")}>
                                                    {asset.remainingYears}
                                                </span>
                                            </TableCell>
                                            <TableCell className="px-4 py-3 align-middle text-center text-sm text-muted-foreground whitespace-nowrap">
                                                {asset.endDate.toLocaleDateString()}
                                            </TableCell>
                                            <TableCell className="px-4 py-3 align-middle text-center">
                                                {asset.isFullyDepreciated ? (
                                                    <span className="text-muted-foreground text-sm whitespace-nowrap inline-flex">Fully Depreciated</span>
                                                ) : asset.isNearEndOfLife ? (
                                                    <span className="text-sm text-destructive whitespace-nowrap inline-flex">Expiring Soon</span>
                                                ) : (
                                                    <span className="text-emerald-600 text-sm whitespace-nowrap inline-flex">Depreciating</span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                        <div className="px-6 py-4 border-t border-border/40 flex items-center justify-between">
                            <div className="text-sm text-muted-foreground">
                                Showing {filteredAssets.length} assets
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow className="bg-muted/50 hover:bg-muted/50">
                                    <TableHead className="h-10 px-4 align-middle text-xs font-medium text-muted-foreground w-[20%] text-left">Room / Location</TableHead>
                                    <TableHead className="h-10 px-4 align-middle text-xs font-medium text-muted-foreground w-[10%] text-center">Total Assets</TableHead>
                                    <CurrencyHeader className="w-[15%]">Total Initial Cost</CurrencyHeader>
                                    <CurrencyHeader className="w-[15%]">Current Book Value</CurrencyHeader>
                                    <CurrencyHeader className="w-[15%]">Monthly Exposure</CurrencyHeader>
                                    <TableHead className="h-10 px-4 align-middle text-xs font-medium text-muted-foreground w-[10%] text-center">Fully Depreciated</TableHead>
                                    <TableHead className="h-10 px-4 align-middle text-xs font-medium text-muted-foreground w-[15%] text-left">Value Retention</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {roomDepreciationData.map((room) => (
                                    <TableRow key={room.name} className="hover:bg-muted/30 transition-colors">
                                        <TableCell className="p-4 align-middle text-left">
                                            <div className="flex items-center gap-2">
                                                <Building2 className="w-4 h-4 text-muted-foreground" />
                                                <span className="truncate max-w-[150px] font-normal text-sm text-foreground" title={room.name}>{room.name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="p-4 align-middle text-center text-sm font-normal">{room.totalAssets}</TableCell>
                                        <TableCell className="p-4 align-middle text-right text-sm font-normal"><CurrencyCell value={room.totalCost} /></TableCell>
                                        <TableCell className="p-4 align-middle text-right text-sm font-normal text-foreground"><CurrencyCell value={room.totalBookValue} /></TableCell>
                                        <TableCell className="p-4 align-middle text-right text-sm text-red-600 font-normal"><CurrencyCell value={-room.monthlyDepreciation} className="text-red-600" /></TableCell>
                                        <TableCell className="p-4 align-middle text-center text-sm">
                                            {room.fullyDepreciatedCount > 0 ? (
                                                <span className="text-sm font-normal text-foreground">{room.fullyDepreciatedCount}</span>
                                            ) : (
                                                <span className="text-muted-foreground">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="p-4 align-middle text-left text-sm">
                                            <div className="flex items-center justify-start gap-3">
                                                <span className="text-xs text-muted-foreground w-12 text-left">
                                                    {room.totalCost > 0 ? ((room.totalBookValue / room.totalCost) * 100).toFixed(1) : "0.0"}%
                                                </span>
                                                <Progress value={room.totalCost > 0 ? (room.totalBookValue / room.totalCost) * 100 : 0} className="w-20 h-2" />
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </div>
        </div>
    );
}
