"use client";

import { useState, useMemo } from "react";
import { TrendingDown, DollarSign, Calendar, Package, BarChart3, Search, Filter } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Asset } from "@/types/asset";
import { useAssets } from "@/hooks/use-assets";
import { Skeleton } from "@/components/ui/skeleton";

interface DepreciationViewProps {
    onAssetClick?: (asset: Asset) => void;
}

function calculateDepreciation(asset: Asset) {
    const purchasePrice = asset.purchasePrice ?? asset.value ?? 0;
    const usefulLifeYears = asset.usefulLifeYears ?? 0;

    if (purchasePrice <= 0 || usefulLifeYears <= 0) {
        return { monthlyDep: 0, currentBookValue: purchasePrice, depPercent: 0, totalDepreciation: 0, ageMonths: 0 };
    }

    const monthlyDep = purchasePrice / (usefulLifeYears * 12);

    // Calculate age in months from purchase date
    let ageMonths = 0;
    if (asset.purchaseDate) {
        const purchaseDate = new Date(asset.purchaseDate);
        const now = new Date();
        ageMonths = (now.getFullYear() - purchaseDate.getFullYear()) * 12 + (now.getMonth() - purchaseDate.getMonth());
        if (ageMonths < 0) ageMonths = 0;
    }

    const totalDepreciation = Math.min(monthlyDep * ageMonths, purchasePrice);
    const currentBookValue = Math.max(purchasePrice - totalDepreciation, 0);
    const depPercent = purchasePrice > 0 ? (totalDepreciation / purchasePrice) * 100 : 0;

    return { monthlyDep, currentBookValue, totalDepreciation, depPercent, ageMonths };
}

export function DepreciationView({ onAssetClick }: DepreciationViewProps) {
    const { data: assets = [], isLoading } = useAssets();
    const [searchQuery, setSearchQuery] = useState("");
    const [dateFilter, setDateFilter] = useState("All Time");

    const depreciationData = useMemo(() => {
        // Filter assets first
        const filteredAssets = assets.filter(asset => {
            // Text Search
            const query = searchQuery.toLowerCase();
            const matchesSearch = asset.desc.toLowerCase().includes(query) || asset.id.toLowerCase().includes(query);
            if (!matchesSearch) return false;

            // Date Filter (Acquisition Date)
            if (dateFilter !== "All Time") {
                if (!asset.purchaseDate) return false;
                const date = new Date(asset.purchaseDate);
                const now = new Date();

                if (dateFilter === "Acquired This Year") {
                    if (date.getFullYear() !== now.getFullYear()) return false;
                }
                if (dateFilter === "Acquired Last Year") {
                    if (date.getFullYear() !== now.getFullYear() - 1) return false;
                }
            }
            return true;
        });

        return filteredAssets.map(asset => ({
            asset,
            ...calculateDepreciation(asset),
        }));
    }, [assets, searchQuery, dateFilter]);

    // Summary calculations (based on filtered data or total? Usually total for high level, but let's do filtered to reflect view)
    // Actually, summary cards usually show the "Total Portfolio", so maybe keep them based on ALL assets?
    // Let's stick to ALL assets for the summary cards to show global health, and filter the table.

    const allDepreciationData = useMemo(() => assets.map(asset => ({ asset, ...calculateDepreciation(asset) })), [assets]);

    const totalPortfolioValue = allDepreciationData.reduce((sum, d) => sum + (d.asset.purchasePrice ?? d.asset.value ?? 0), 0);
    const totalDepreciation = allDepreciationData.reduce((sum, d) => sum + d.totalDepreciation, 0);
    const totalCurrentValue = allDepreciationData.reduce((sum, d) => sum + d.currentBookValue, 0);
    const assetsWithLife = allDepreciationData.filter(d => (d.asset.usefulLifeYears ?? 0) > 0);
    const avgUsefulLife = assetsWithLife.length > 0
        ? assetsWithLife.reduce((sum, d) => sum + (d.asset.usefulLifeYears ?? 0), 0) / assetsWithLife.length
        : 0;

    const summaryCards = [
        { label: "Original Portfolio Value", value: `$${totalPortfolioValue.toLocaleString()}`, icon: DollarSign, color: "bg-primary" },
        { label: "Total Depreciation", value: `$${totalDepreciation.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, icon: TrendingDown, color: "bg-red-500" },
        { label: "Current Book Value", value: `$${totalCurrentValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, icon: BarChart3, color: "bg-emerald-500" },
        { label: "Avg. Useful Life", value: `${avgUsefulLife.toFixed(1)} yrs`, icon: Calendar, color: "bg-amber-500" },
    ];

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <Skeleton key={i} className="h-28 rounded-xl" />
                    ))}
                </div>
                <div className="rounded-xl border border-border p-6 space-y-4">
                    <div className="flex justify-between items-center mb-6">
                        <Skeleton className="h-8 w-48" />
                        <Skeleton className="h-8 w-32" />
                    </div>
                    <div className="space-y-2">
                        {[...Array(5)].map((_, i) => (
                            <Skeleton key={i} className="h-16 w-full" />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {summaryCards.map((stat) => (
                    <Card key={stat.label} className="border-border">
                        <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-lg font-semibold text-foreground tracking-tight">{stat.value}</p>
                                    <p className="text-[11px] font-medium text-muted-foreground mt-0.5">{stat.label}</p>
                                </div>
                                <div className={`${stat.color} p-1.5 rounded-md`}>
                                    <stat.icon size={14} className="text-white" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Depreciation Table */}
            <Card className="border-border">
                <div className="p-6 border-b border-border bg-muted/40">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                <TrendingDown size={18} />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-foreground">Asset Depreciation Schedule</h3>
                                <p className="text-xs text-muted-foreground mt-0.5">Straight-line depreciation auto-calculated per asset</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="p-4 border-b border-border bg-muted/20 flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search assets..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 h-9 bg-background"
                        />
                    </div>
                    <Select value={dateFilter} onValueChange={setDateFilter}>
                        <SelectTrigger className="w-[160px] h-9 bg-background">
                            <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                            <SelectValue placeholder="Acquisition Date" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="All Time">All Time</SelectItem>
                            <SelectItem value="Acquired This Year">Acquired This Year</SelectItem>
                            <SelectItem value="Acquired Last Year">Acquired Last Year</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/30">
                                <TableHead className="text-xs font-medium text-muted-foreground">Asset</TableHead>
                                <TableHead className="text-xs font-medium text-muted-foreground text-center">Category</TableHead>
                                <TableHead className="text-xs font-medium text-muted-foreground text-right">Purchase Price</TableHead>
                                <TableHead className="text-xs font-medium text-muted-foreground text-center">Useful Life</TableHead>
                                <TableHead className="text-xs font-medium text-muted-foreground text-center">Age (Months)</TableHead>
                                <TableHead className="text-xs font-medium text-muted-foreground text-right">Monthly Dep.</TableHead>
                                <TableHead className="text-xs font-medium text-muted-foreground text-right">Total Dep.</TableHead>
                                <TableHead className="text-xs font-medium text-muted-foreground text-right">Book Value</TableHead>
                                <TableHead className="text-xs font-medium text-muted-foreground text-center">Dep. %</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {depreciationData.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={9} className="h-32 text-center">
                                        <div className="flex flex-col items-center text-muted-foreground">
                                            <Package size={32} className="mb-2 opacity-30" />
                                            <p className="text-sm">No assets match your filters</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                depreciationData.map(({ asset, monthlyDep, currentBookValue, totalDepreciation, depPercent, ageMonths }) => {
                                    const purchasePrice = asset.purchasePrice ?? asset.value ?? 0;
                                    const hasDepData = (asset.usefulLifeYears ?? 0) > 0 && purchasePrice > 0;

                                    return (
                                        <TableRow key={asset.id} className="hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => onAssetClick?.(asset)}>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium text-foreground">{asset.desc}</span>
                                                    <span className="text-[10px] font-mono text-muted-foreground">{asset.id}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant="outline" className="text-[10px]">{asset.cat}</Badge>
                                            </TableCell>
                                            <TableCell className="text-right text-sm font-medium">
                                                ${purchasePrice.toLocaleString()}
                                            </TableCell>
                                            <TableCell className="text-center text-sm">
                                                {hasDepData ? `${asset.usefulLifeYears} yrs` : <span className="text-muted-foreground">—</span>}
                                            </TableCell>
                                            <TableCell className="text-center text-sm">
                                                {hasDepData && asset.purchaseDate ? ageMonths : <span className="text-muted-foreground">—</span>}
                                            </TableCell>
                                            <TableCell className="text-right text-sm font-mono">
                                                {hasDepData ? `$${monthlyDep.toFixed(2)}` : <span className="text-muted-foreground">—</span>}
                                            </TableCell>
                                            <TableCell className="text-right text-sm font-mono text-red-600 dark:text-red-400">
                                                {hasDepData ? `$${totalDepreciation.toFixed(0)}` : <span className="text-muted-foreground">—</span>}
                                            </TableCell>
                                            <TableCell className="text-right text-sm font-semibold">
                                                ${currentBookValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {hasDepData ? (
                                                    <div className="flex items-center justify-center gap-2">
                                                        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full transition-all ${depPercent >= 80 ? "bg-red-500" : depPercent >= 50 ? "bg-amber-500" : "bg-emerald-500"}`}
                                                                style={{ width: `${Math.min(depPercent, 100)}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-[10px] font-medium text-muted-foreground w-10 text-right">
                                                            {depPercent.toFixed(0)}%
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground text-sm">—</span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>
            </Card>
        </div>
    );
}
