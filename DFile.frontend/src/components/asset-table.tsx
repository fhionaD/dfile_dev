import { useState, useMemo } from "react";
import { QrCode, FileBarChart, ArrowUpDown, ArrowUp, ArrowDown, Archive, RotateCcw, Search, Filter, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QRCodeModal } from "@/components/modals/qr-code-modal";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";

import { Asset } from "@/types/asset";
import { useAssets, useArchiveAsset } from "@/hooks/use-assets";
import { Skeleton } from "@/components/ui/skeleton";

const statusColors: Record<string, string> = {
    "In Use": "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
    "Available": "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20",
    "Maintenance": "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
    "Disposed": "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
};

type SortKey = keyof Asset;
type SortDirection = "asc" | "desc";

interface AssetTableProps {
    onAssetClick?: (asset: Asset) => void;
}

export function AssetTable({ onAssetClick }: AssetTableProps) {
    const { data: assets = [], isLoading } = useAssets();
    const archiveAssetMutation = useArchiveAsset();

    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection } | null>(null);
    const [showArchived, setShowArchived] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [categoryFilter, setCategoryFilter] = useState("All");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    // Derived Data
    const uniqueCategories = useMemo(() => Array.from(new Set(assets.map(a => a.cat))).sort(), [assets]);

    const filteredAssets = useMemo(() => {
        return assets.filter(asset => {
            // Archive Status
            if (showArchived ? asset.status !== "Archived" : asset.status === "Archived") return false;

            // Text Search
            const query = searchQuery.toLowerCase();
            const matchesSearch =
                asset.desc.toLowerCase().includes(query) ||
                asset.id.toLowerCase().includes(query) ||
                asset.model?.toLowerCase().includes(query) ||
                asset.serialNumber?.toLowerCase().includes(query);

            if (!matchesSearch) return false;

            // Status Filter
            if (statusFilter !== "All" && asset.status !== statusFilter) return false;

            // Category Filter
            if (categoryFilter !== "All" && asset.cat !== categoryFilter) return false;

            return true;
        });
    }, [assets, showArchived, searchQuery, statusFilter, categoryFilter]);

    const handleSort = (key: SortKey) => {
        let direction: SortDirection = "asc";
        if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
            direction = "desc";
        }
        setSortConfig({ key, direction });
        setCurrentPage(1); // Reset to first page on sort
    };

    const sortedAssets = [...filteredAssets].sort((a, b) => {
        if (!sortConfig) return 0;
        const { key, direction } = sortConfig;

        const aValue = a[key] ?? "";
        const bValue = b[key] ?? "";

        if (aValue < bValue) return direction === "asc" ? -1 : 1;
        if (aValue > bValue) return direction === "asc" ? 1 : -1;
        return 0;
    });

    const getSortIcon = (key: SortKey) => {
        if (sortConfig?.key !== key) return <ArrowUpDown size={14} className="ml-2 text-muted-foreground/50" />;
        return sortConfig.direction === "asc" ? <ArrowUp size={14} className="ml-2 text-foreground" /> : <ArrowDown size={14} className="ml-2 text-foreground" />;
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
    };

    // Pagination Logic
    const totalPages = Math.ceil(sortedAssets.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedAssets = sortedAssets.slice(startIndex, startIndex + itemsPerPage);

    const [selectedAssetForQR, setSelectedAssetForQR] = useState<Asset | null>(null);

    const handleExportCSV = () => {
        const headers = ["Asset ID", "Asset Name", "Category", "Status", "Room", "Value"];
        const rows = sortedAssets.map(asset => [
            asset.id,
            `"${asset.desc.replace(/"/g, '""')}"`, // Escape quotes
            asset.cat,
            asset.status,
            asset.room,
            asset.value.toFixed(2)
        ]);

        const csvContent = [
            headers.join(","),
            ...rows.map(r => r.join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `fleet_report_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (isLoading) {
        return (
            <div className="rounded-xl border border-border overflow-hidden bg-card p-6 space-y-4">
                <div className="flex justify-between items-center mb-6">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-8 w-32" />
                </div>
                <div className="flex gap-4 mb-6">
                    <Skeleton className="h-10 flex-1" />
                    <Skeleton className="h-10 w-32" />
                    <Skeleton className="h-10 w-32" />
                </div>
                <div className="space-y-2">
                    {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-16 w-full" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <QRCodeModal
                open={!!selectedAssetForQR}
                onOpenChange={(open) => !open && setSelectedAssetForQR(null)}
                asset={selectedAssetForQR}
            />

            <Card className="border-border">
                {/* Header */}
                <div className="p-6 border-b border-border bg-muted/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-primary/10 rounded-lg text-primary">
                            <Package size={18} />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-foreground">Fleet Registry</h3>
                            <p className="text-xs text-muted-foreground mt-0.5">Manage and track all company assets</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant={showArchived ? "default" : "outline"} size="sm" className="text-xs font-medium h-8" onClick={() => setShowArchived(!showArchived)}>
                            {showArchived ? <><RotateCcw size={14} className="mr-1.5" />Active ({assets.filter(a => a.status !== "Archived").length})</> : <><Archive size={14} className="mr-1.5" />Archived ({assets.filter(a => a.status === "Archived").length})</>}
                        </Button>
                        <Button variant="outline" size="sm" className="text-xs font-medium h-8" onClick={handleExportCSV}>
                            <FileBarChart size={14} className="mr-1.5" />
                            Export
                        </Button>
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
                    <div className="flex gap-2">
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[180px] h-9 bg-background">
                                <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="All">All Status</SelectItem>
                                <SelectItem value="In Use">In Use</SelectItem>
                                <SelectItem value="Available">Available</SelectItem>
                                <SelectItem value="Maintenance">Maintenance</SelectItem>
                                <SelectItem value="Disposed">Disposed</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                            <SelectTrigger className="w-[200px] h-9 bg-background">
                                <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                                <SelectValue placeholder="Category" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="All">All Categories</SelectItem>
                                {uniqueCategories.map(cat => (
                                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50 hover:bg-muted/50">
                                <TableHead onClick={() => handleSort("id")} className="cursor-pointer hover:bg-muted/50 transition-colors text-center text-xs font-medium text-muted-foreground">
                                    <div className="flex items-center justify-center">Asset ID {getSortIcon("id")}</div>
                                </TableHead>
                                <TableHead onClick={() => handleSort("desc")} className="cursor-pointer hover:bg-muted/50 transition-colors text-xs font-medium text-muted-foreground">
                                    <div className="flex items-center">Asset Name {getSortIcon("desc")}</div>
                                </TableHead>
                                <TableHead onClick={() => handleSort("cat")} className="cursor-pointer hover:bg-muted/50 transition-colors text-xs font-medium text-muted-foreground">
                                    <div className="flex items-center">Category {getSortIcon("cat")}</div>
                                </TableHead>
                                <TableHead onClick={() => handleSort("status")} className="cursor-pointer hover:bg-muted/50 transition-colors text-xs font-medium text-muted-foreground">
                                    <div className="flex items-center">Status {getSortIcon("status")}</div>
                                </TableHead>
                                <TableHead onClick={() => handleSort("room")} className="cursor-pointer hover:bg-muted/50 transition-colors text-xs font-medium text-muted-foreground">
                                    <div className="flex items-center">Room {getSortIcon("room")}</div>
                                </TableHead>
                                <TableHead onClick={() => handleSort("value")} className="cursor-pointer hover:bg-muted/50 transition-colors text-xs font-medium text-muted-foreground">
                                    <div className="flex items-center">Value {getSortIcon("value")}</div>
                                </TableHead>
                                <TableHead className="text-xs font-medium text-muted-foreground">QR</TableHead>
                                <TableHead className="text-xs font-medium text-muted-foreground text-center w-[80px]">{showArchived ? "Restore" : "Archive"}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedAssets.filter(a => showArchived ? a.status === "Archived" : a.status !== "Archived").map((asset) => (
                                <TableRow
                                    key={asset.id}
                                    className="border-border cursor-pointer hover:bg-muted/30 transition-colors"
                                    onClick={() => onAssetClick?.(asset)}
                                >
                                    <TableCell className="font-mono text-xs font-medium text-foreground text-center">{asset.id}</TableCell>
                                    <TableCell className="text-sm text-foreground font-medium">{asset.desc}</TableCell>
                                    <TableCell className="text-sm text-muted-foreground">{asset.cat}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={`${statusColors[asset.status]} rounded-md text-xs font-medium`}>
                                            {asset.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">{asset.room}</TableCell>
                                    <TableCell className="text-sm font-medium text-foreground">{formatCurrency(asset.value)}</TableCell>
                                    <TableCell>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedAssetForQR(asset);
                                            }}
                                            className="p-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors"
                                        >
                                            <QrCode size={16} />
                                        </button>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                archiveAssetMutation.mutate(asset.id);
                                            }}
                                            className={`p-1.5 rounded-md transition-colors ${asset.status === 'Archived' ? 'text-primary hover:bg-primary/10' : 'text-muted-foreground hover:text-destructive hover:bg-destructive/10'}`}
                                            title={asset.status === 'Archived' ? 'Restore' : 'Archive'}
                                        >
                                            {asset.status === 'Archived' ? <RotateCcw size={16} /> : <Archive size={16} />}
                                        </button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination Footer */}
                <div className="p-4 border-t border-border flex items-center justify-between bg-muted/20">
                    <div className="text-xs text-muted-foreground font-medium">
                        Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, sortedAssets.length)} of {sortedAssets.length}
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs font-medium"
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                        >
                            Previous
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs font-medium"
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                        >
                            Next
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
}
