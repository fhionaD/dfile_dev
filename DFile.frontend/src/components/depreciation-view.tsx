"use client";

import { useState, useMemo } from "react";
import { TrendingDown, TrendingUp, AlertTriangle, Building2, Calendar, DollarSign, Package, PieChart, Info, Download, Lock, RefreshCw, FileText, Search, Filter, ChevronDown, ChevronRight, Calculator } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAssets } from "@/hooks/use-assets";
import { Input } from "@/components/ui/input";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Asset } from "@/types/asset";
import { cn } from "@/lib/utils";

interface DepreciationViewProps {
    onAssetClick?: (asset: Asset) => void;
}

// Helper to calculate depreciation details
function calculateAssetDepreciation(asset: Asset) {
    const cost = asset.purchasePrice ?? asset.value ?? 0;
    const usefulLifeYears = asset.usefulLifeYears ?? 5; // Default 5 years if not set
    const purchaseDate = asset.purchaseDate ? new Date(asset.purchaseDate) : new Date();
    const now = new Date();
    
    // Calculate Age in Months
    const ageInMonths = (now.getFullYear() - purchaseDate.getFullYear()) * 12 + (now.getMonth() - purchaseDate.getMonth());
    const totalLifeMonths = usefulLifeYears * 12;
    
    // Monthly Depreciation
    const monthlyDepreciation = usefulLifeYears > 0 ? cost / totalLifeMonths : 0;
    
    // Accumulated Depreciation
    const accumulatedDepreciation = Math.min(cost, monthlyDepreciation * ageInMonths);
    
    // Current Book Value
    const currentBookValue = Math.max(0, cost - accumulatedDepreciation);
    
    // Remaining Life
    const remainingMonths = Math.max(0, totalLifeMonths - ageInMonths);
    const remainingYears = (remainingMonths / 12).toFixed(1);

    // End Date
    const endDate = new Date(purchaseDate);
    endDate.setMonth(endDate.getMonth() + totalLifeMonths);

    // Status Flags
    const isFullyDepreciated = currentBookValue === 0;
    const isNearEndOfLife = !isFullyDepreciated && remainingMonths <= 6;
    const isLowValue = currentBookValue > 0 && currentBookValue < (cost * 0.1); // < 10% value

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
        isLowValue
    };
}


export function DepreciationView({ onAssetClick }: DepreciationViewProps) {
    const { data: assets = [], isLoading } = useAssets();
    const [viewMode, setViewMode] = useState<"assets" | "rooms">("assets");
    const [searchQuery, setSearchQuery] = useState("");
    const [roomFilter, setRoomFilter] = useState("All");
    const [categoryFilter, setCategoryFilter] = useState("All");
    const [statusFilter, setStatusFilter] = useState("Active"); // Default active only

    // --- Computed Data ---
    const processedAssets = useMemo(() => {
        return assets.map(asset => {
            const depDetails = calculateAssetDepreciation(asset);
            return { ...asset, ...depDetails };
        });
    }, [assets]);

    const filteredAssets = useMemo(() => {
        return processedAssets.filter(asset => {
            if (statusFilter === "Active" && (asset.status === "Archived" || asset.status === "Disposed")) return false;
            if (statusFilter === "Archived" && asset.status !== "Archived" && asset.status !== "Disposed") return false;
            if (statusFilter === "Fully Depreciated" && !asset.isFullyDepreciated) return false;
            if (statusFilter === "Near End-of-Life" && !asset.isNearEndOfLife) return false;

            if (roomFilter !== "All" && asset.room !== roomFilter) return false;
            if (categoryFilter !== "All" && asset.cat !== categoryFilter) return false;

            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                return asset.desc.toLowerCase().includes(q) || 
                       asset.id.toLowerCase().includes(q) || 
                       (asset.room || "").toLowerCase().includes(q);
            }

            return true;
        });
    }, [processedAssets, statusFilter, roomFilter, categoryFilter, searchQuery]);


    // --- Room Aggregation ---
    const roomDepreciationData = useMemo(() => {
        const rooms: Record<string, { 
            name: string, 
            totalAssets: number, 
            totalCost: number, 
            totalBookValue: number, 
            monthlyDepreciation: number,
            fullyDepreciatedCount: number 
        }> = {};

        processedAssets.forEach(asset => {
            if (asset.status === "Archived" || asset.status === "Disposed") return; // Skip archived for active report

            const roomName = asset.room || "Unassigned";
            if (!rooms[roomName]) {
                rooms[roomName] = { 
                    name: roomName, 
                    totalAssets: 0, 
                    totalCost: 0, 
                    totalBookValue: 0, 
                    monthlyDepreciation: 0,
                    fullyDepreciatedCount: 0 
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


    // --- Unique Select Options ---
    const uniqueRooms = useMemo(() => Array.from(new Set(assets.map(a => a.room || "Unassigned").filter(Boolean))), [assets]);
    const uniqueCategories = useMemo(() => Array.from(new Set(assets.map(a => a.cat).filter(Boolean))), [assets]);

    // Format Currency
    const fmt = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'PHP' }).format(val);


    if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading Depreciation Data...</div>;

    return (
        <div className="space-y-6 pb-10">
            {/* Header & Actions */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-2">
                     <div className="bg-muted p-1 rounded-lg flex items-center">
                        <Button 
                            variant={viewMode === "assets" ? "secondary" : "ghost"} 
                            size="sm" 
                            onClick={() => setViewMode("assets")}
                            className="h-7 text-xs"
                        >
                            <Package className="w-3 h-3 mr-1.5" /> By Asset
                        </Button>
                        <Button 
                            variant={viewMode === "rooms" ? "secondary" : "ghost"} 
                            size="sm" 
                            onClick={() => setViewMode("rooms")}
                            className="h-7 text-xs"
                        >
                            <Building2 className="w-3 h-3 mr-1.5" /> By Room
                        </Button>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="h-9">
                        <Lock className="w-3.5 h-3.5 mr-1.5" /> Lock Period
                    </Button>
                     <Button variant="default" size="sm" className="h-9">
                        <Download className="w-3.5 h-3.5 mr-1.5" /> Export Report
                    </Button>
                </div>
            </div>

            {/* Controls / Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-card p-4 rounded-xl border border-border shadow-sm">
                <div className="flex flex-1 w-full gap-3">
                     <div className="relative flex-1 max-w-xs">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search asset, ID, or room..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 bg-background h-9"
                        />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[160px] h-9 bg-background">
                            <Filter className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="All">All Status</SelectItem>
                            <SelectItem value="Active">Active Assets</SelectItem>
                            <SelectItem value="Fully Depreciated">Fully Depreciated</SelectItem>
                            <SelectItem value="Near End-of-Life">Near End-of-Life</SelectItem>
                            <SelectItem value="Archived">Archived / Retired</SelectItem>
                        </SelectContent>
                    </Select>
                     <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                        <SelectTrigger className="w-[160px] h-9 bg-background">
                            <Package className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                            <SelectValue placeholder="Category" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="All">All Categories</SelectItem>
                             {uniqueCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                 <div className="flex items-center text-xs text-muted-foreground">
                    <RefreshCw className="w-3 h-3 mr-1.5" /> Last Computed: Today
                </div>
            </div>

            {/* Content View */}
            {viewMode === "assets" ? (
                <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-muted/30">
                                <TableRow>
                                    <TableHead className="w-[200px]">Asset Details</TableHead>
                                    <TableHead>Purchased</TableHead>
                                    <TableHead className="text-right">Cost Basis</TableHead>
                                    <TableHead className="text-center">Useful Life</TableHead>
                                    <TableHead className="text-right">Monthly Depr.</TableHead>
                                    <TableHead className="text-right">Accum. Depr.</TableHead>
                                    <TableHead className="text-right font-bold text-emerald-600">Book Value</TableHead>
                                    <TableHead className="text-center">Remaining</TableHead>
                                    <TableHead className="text-center">End Date</TableHead>
                                    <TableHead className="text-center">Status</TableHead>
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
                                    filteredAssets.map(asset => (
                                        <TableRow key={asset.id} className="hover:bg-muted/40 cursor-pointer" onClick={() => onAssetClick?.(asset)}>
                                            <TableCell>
                                                <div className="font-medium text-sm text-foreground">{asset.desc}</div>
                                                <div className="text-xs text-muted-foreground flex items-center gap-1">
                                                    <span className="font-mono">{asset.id}</span> • {asset.room || "Unassigned"}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm">{asset.purchaseDate ? new Date(asset.purchaseDate).toLocaleDateString() : "—"}</TableCell>
                                            <TableCell className="text-right text-sm font-medium">{fmt(asset.cost)}</TableCell>
                                            <TableCell className="text-center text-sm">{asset.usefulLifeYears} yr</TableCell>
                                            <TableCell className="text-right text-sm">{fmt(asset.monthlyDepreciation)}</TableCell>
                                            <TableCell className="text-right text-sm text-muted-foreground">{fmt(asset.accumulatedDepreciation)}</TableCell>
                                            <TableCell className="text-right text-sm font-bold text-foreground">{fmt(asset.currentBookValue)}</TableCell>
                                            <TableCell className="text-center text-sm">
                                                 <Badge variant="outline" className={cn("font-mono font-normal text-xs", asset.isNearEndOfLife ? "bg-red-50 text-red-600 border-red-200" : "")}>
                                                    {asset.remainingYears} yr
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-center text-xs text-muted-foreground">
                                                {asset.endDate.toLocaleDateString()}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {asset.isFullyDepreciated ? (
                                                    <Badge variant="secondary" className="bg-muted text-muted-foreground text-[10px]">Fully Depreciated</Badge>
                                                ) : asset.isNearEndOfLife ? (
                                                    <Badge variant="destructive" className="text-[10px]">Expiring Soon</Badge>
                                                ) : (
                                                    <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50 text-[10px]">Depreciating</Badge>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                     <div className="bg-muted/20 p-2 border-t border-border text-center text-xs text-muted-foreground">
                        Showing {filteredAssets.length} assets
                    </div>
                </div>
            ) : (
                <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
                     <Table>
                        <TableHeader className="bg-muted/30">
                            <TableRow>
                                <TableHead className="w-[200px]">Room / Location</TableHead>
                                <TableHead className="text-center">Total Assets</TableHead>
                                <TableHead className="text-right">Total Initial Cost</TableHead>
                                <TableHead className="text-right font-bold text-emerald-600">Current Book Value</TableHead>
                                <TableHead className="text-right">Monthly Depreciation Exposure</TableHead>
                                <TableHead className="text-center">Fully Depreciated Assets</TableHead>
                                <TableHead className="text-right">Value Retention</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                             {roomDepreciationData.map(room => (
                                <TableRow key={room.name} className="hover:bg-muted/40">
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-2">
                                            <Building2 className="w-4 h-4 text-muted-foreground" />
                                            {room.name}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center text-sm">{room.totalAssets}</TableCell>
                                    <TableCell className="text-right text-sm">{fmt(room.totalCost)}</TableCell>
                                    <TableCell className="text-right text-sm font-bold text-foreground">{fmt(room.totalBookValue)}</TableCell>
                                    <TableCell className="text-right text-sm text-red-600 font-medium">-{fmt(room.monthlyDepreciation)}</TableCell>
                                    <TableCell className="text-center text-sm">
                                        {room.fullyDepreciatedCount > 0 ? (
                                             <Badge variant="secondary">{room.fullyDepreciatedCount}</Badge>
                                        ) : (
                                            <span className="text-muted-foreground">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right text-sm">
                                        <div className="flex items-center justify-end gap-2">
                                             <span className="text-xs text-muted-foreground">
                                                {room.totalCost > 0 ? ((room.totalBookValue / room.totalCost) * 100).toFixed(1) : 0}%
                                            </span>
                                            <Progress value={room.totalCost > 0 ? (room.totalBookValue / room.totalCost) * 100 : 0} className="w-16 h-1.5" />
                                        </div>
                                    </TableCell>
                                </TableRow>
                             ))}
                        </TableBody>
                    </Table>
                </div>
            )}
        </div>
    );
}
