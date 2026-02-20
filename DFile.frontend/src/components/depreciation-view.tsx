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


    if (isLoading) return (
        <div className="flex items-center justify-center p-8 h-[200px]">
             <div className="flex flex-col items-center gap-2">
                <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Calculating depreciation schedules...</p>
             </div>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-background p-1 rounded-lg">
                <div className="flex flex-1 gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0 items-center">
                    <div className="relative flex-1 max-w-sm min-w-[200px]">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search asset, ID, or room..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 h-10 bg-background text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[160px] h-10 bg-background text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Filter className="w-3.5 h-3.5" />
                                <span className="text-foreground">{statusFilter}</span>
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
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                        <SelectTrigger className="w-[160px] h-10 bg-background text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Package className="w-3.5 h-3.5" />
                                <span className="text-foreground">{categoryFilter === 'All' ? 'Category' : categoryFilter}</span>
                            </div>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="All">All Categories</SelectItem>
                                {uniqueCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <div className="bg-muted p-1 rounded-lg flex items-center mr-2 h-10">
                        <Button 
                            variant={viewMode === "assets" ? "secondary" : "ghost"} 
                            size="sm" 
                            onClick={() => setViewMode("assets")}
                            className="h-8 text-xs font-medium bg-background shadow-sm"
                        >
                            <Package className="w-3.5 h-3.5 mr-1.5" /> Asset View
                        </Button>
                        <Button 
                            variant={viewMode === "rooms" ? "secondary" : "ghost"} 
                            size="sm" 
                            onClick={() => setViewMode("rooms")}
                            className="h-8 text-xs font-medium"
                        >
                            <Building2 className="w-3.5 h-3.5 mr-1.5" /> Room View
                        </Button>
                    </div>
                    <Button variant="outline" size="sm" className="h-10 text-sm font-medium">
                        <Lock className="w-4 h-4 mr-2" /> Lock Period
                    </Button>
                     <Button variant="outline" size="sm" className="h-10 text-sm font-medium">
                        <Download className="w-4 h-4 mr-2" /> Export
                    </Button>
                </div>
            </div>

            <Card className="border-border shadow-sm rounded-xl overflow-hidden">
                <CardContent className="p-0">
                {/* Content View */}
                {viewMode === "assets" ? (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow className="hover:bg-muted/50 border-border">
                                    <TableHead className="h-10 px-4 align-middle font-medium text-muted-foreground w-[200px] text-left">Asset Details</TableHead>
                                    <TableHead className="h-10 px-4 align-middle font-medium text-muted-foreground text-left">Purchased</TableHead>
                                    <TableHead className="h-10 px-4 align-middle font-medium text-muted-foreground text-right">Cost Basis</TableHead>
                                    <TableHead className="h-10 px-4 align-middle font-medium text-muted-foreground text-left">Life (Yrs)</TableHead>
                                    <TableHead className="h-10 px-4 align-middle font-medium text-muted-foreground text-right">Monthly Depr.</TableHead>
                                    <TableHead className="h-10 px-4 align-middle font-medium text-muted-foreground text-right">Accum. Depr.</TableHead>
                                    <TableHead className="h-10 px-4 align-middle font-bold text-emerald-600 text-right">Book Value</TableHead>
                                    <TableHead className="h-10 px-4 align-middle font-medium text-muted-foreground text-left">Remaining</TableHead>
                                    <TableHead className="h-10 px-4 align-middle font-medium text-muted-foreground text-left">End Date</TableHead>
                                    <TableHead className="h-10 px-4 align-middle font-medium text-muted-foreground text-left">Status</TableHead>
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
                                        <TableRow key={asset.id} className="hover:bg-muted/5 cursor-pointer border-border" onClick={() => onAssetClick?.(asset)}>
                                            <TableCell className="p-4 align-middle text-left">
                                                <div className="font-medium text-sm text-foreground">{asset.desc}</div>
                                                <div className="text-xs text-muted-foreground flex items-center gap-1">
                                                    <span className="font-mono">{asset.id}</span> • {asset.room || "Unassigned"}
                                                </div>
                                            </TableCell>
                                            <TableCell className="p-4 align-middle text-sm text-muted-foreground text-left">{asset.purchaseDate ? new Date(asset.purchaseDate).toLocaleDateString() : "—"}</TableCell>
                                            <TableCell className="p-4 align-middle text-right text-sm font-medium">{fmt(asset.cost)}</TableCell>
                                            <TableCell className="p-4 align-middle text-left text-sm text-muted-foreground">{asset.usefulLifeYears}</TableCell>
                                            <TableCell className="p-4 align-middle text-right text-sm">{fmt(asset.monthlyDepreciation)}</TableCell>
                                            <TableCell className="p-4 align-middle text-right text-sm text-muted-foreground">{fmt(asset.accumulatedDepreciation)}</TableCell>
                                            <TableCell className="p-4 align-middle text-right text-sm font-bold text-foreground">{fmt(asset.currentBookValue)}</TableCell>
                                            <TableCell className="p-4 align-middle text-left text-sm">
                                                 <Badge variant="outline" className={cn("font-mono font-normal text-xs rounded-none bg-transparent", asset.isNearEndOfLife ? "text-red-600 border-red-200" : "")}>
                                                    {asset.remainingYears}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="p-4 align-middle text-left text-xs text-muted-foreground">
                                                {asset.endDate.toLocaleDateString()}
                                            </TableCell>
                                            <TableCell className="p-4 align-middle text-left">
                                                {asset.isFullyDepreciated ? (
                                                    <Badge variant="outline" className="text-muted-foreground text-[10px] rounded-none border-0 bg-transparent">Fully Depreciated</Badge>
                                                ) : asset.isNearEndOfLife ? (
                                                    <Badge variant="outline" className="text-[10px] text-destructive border-0 rounded-none bg-transparent">Expiring Soon</Badge>
                                                ) : (
                                                    <Badge variant="outline" className="text-emerald-600 border-0 text-[10px] rounded-none bg-transparent">Depreciating</Badge>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                         <div className="p-4 border-t border-border bg-muted/5 flex items-center justify-between">
                            <div className="text-xs text-muted-foreground font-medium">
                                Showing {filteredAssets.length} assets
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                     <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow className="hover:bg-muted/50 border-border">
                                <TableHead className="h-10 px-4 align-middle font-medium text-muted-foreground w-[200px] text-left">Room / Location</TableHead>
                                <TableHead className="h-10 px-4 align-middle font-medium text-muted-foreground text-left">Total Assets</TableHead>
                                <TableHead className="h-10 px-4 align-middle font-medium text-muted-foreground text-right">Total Initial Cost</TableHead>
                                <TableHead className="h-10 px-4 align-middle font-bold text-emerald-600 text-right">Current Book Value</TableHead>
                                <TableHead className="h-10 px-4 align-middle font-medium text-muted-foreground text-right">Monthly Depreciation Exposure</TableHead>
                                <TableHead className="h-10 px-4 align-middle font-medium text-muted-foreground text-left">Fully Depreciated Assets</TableHead>
                                <TableHead className="h-10 px-4 align-middle font-medium text-muted-foreground text-right">Value Retention</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                             {roomDepreciationData.map(room => (
                                <TableRow key={room.name} className="hover:bg-muted/5 border-border">
                                    <TableCell className="p-4 align-middle font-medium text-left">
                                        <div className="flex items-center gap-2">
                                            <Building2 className="w-4 h-4 text-muted-foreground" />
                                            {room.name}
                                        </div>
                                    </TableCell>
                                    <TableCell className="p-4 align-middle text-left text-sm">{room.totalAssets}</TableCell>
                                    <TableCell className="p-4 align-middle text-right text-sm">{fmt(room.totalCost)}</TableCell>
                                    <TableCell className="p-4 align-middle text-right text-sm font-bold text-foreground">{fmt(room.totalBookValue)}</TableCell>
                                    <TableCell className="p-4 align-middle text-right text-sm text-red-600 font-medium">-{fmt(room.monthlyDepreciation)}</TableCell>
                                    <TableCell className="p-4 align-middle text-left text-sm">
                                        {room.fullyDepreciatedCount > 0 ? (
                                             <Badge variant="secondary">{room.fullyDepreciatedCount}</Badge>
                                        ) : (
                                            <span className="text-muted-foreground">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="p-4 align-middle text-right text-sm">
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
                </CardContent>
            </Card>
        </div>
    );
}
