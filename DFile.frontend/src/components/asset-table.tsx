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
    "In Use": "text-emerald-700 dark:text-emerald-400",
    "Available": "text-sky-700 dark:text-sky-400",
    "Maintenance": "text-amber-700 dark:text-amber-400",
    "Disposed": "text-red-700 dark:text-red-400",
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
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(value);
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

            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-background p-1 rounded-lg">
                <div className="flex flex-1 gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0 items-center">
                    <div className="relative flex-1 max-w-sm min-w-[200px]">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search assets..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 h-10 bg-background text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[180px] h-10 bg-background text-sm">
                            <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="All">All Status</SelectItem>
                            {Object.keys(statusColors).map(status => (
                                <SelectItem key={status} value={status}>{status}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                        <SelectTrigger className="w-[180px] h-10 bg-background text-sm">
                            <Package className="w-4 h-4 mr-2 text-muted-foreground" />
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
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <Button variant={showArchived ? "default" : "outline"} size="sm" className="text-sm h-10" onClick={() => setShowArchived(!showArchived)}>
                        {showArchived ? <><RotateCcw size={16} className="mr-2" />Active ({assets.filter(a => a.status !== "Archived").length})</> : <><Archive size={16} className="mr-2" />Archived ({assets.filter(a => a.status === "Archived").length})</>}
                    </Button>
                    <Button variant="outline" size="sm" className="text-sm h-10" onClick={handleExportCSV}>
                        <FileBarChart size={16} className="mr-2" />
                        Export
                    </Button>
                </div>
            </div>

            <Card className="border-border shadow-sm rounded-xl overflow-hidden">
                {/* Table */}
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50 hover:bg-muted/50">
                                <TableHead onClick={() => handleSort("id")} className="h-10 px-4 text-left align-middle font-medium text-muted-foreground cursor-pointer hover:bg-muted/50 transition-colors">
                                    <div className="flex items-center gap-1">Asset ID {getSortIcon("id")}</div>
                                </TableHead>
                                <TableHead onClick={() => handleSort("desc")} className="h-10 px-4 text-left align-middle font-medium text-muted-foreground cursor-pointer hover:bg-muted/50 transition-colors">
                                    <div className="flex items-center justify-start gap-1">Asset Name {getSortIcon("desc")}</div>
                                </TableHead>
                                <TableHead onClick={() => handleSort("cat")} className="h-10 px-4 text-left align-middle font-medium text-muted-foreground cursor-pointer hover:bg-muted/50 transition-colors">
                                    <div className="flex items-center justify-start gap-1">Category {getSortIcon("cat")}</div>
                                </TableHead>
                                <TableHead onClick={() => handleSort("status")} className="h-10 px-4 text-left align-middle font-medium text-muted-foreground cursor-pointer hover:bg-muted/50 transition-colors">
                                    <div className="flex items-center justify-start gap-1">Status {getSortIcon("status")}</div>
                                </TableHead>
                                <TableHead onClick={() => handleSort("room")} className="h-10 px-4 text-left align-middle font-medium text-muted-foreground cursor-pointer hover:bg-muted/50 transition-colors">
                                    <div className="flex items-center justify-start gap-1">Room {getSortIcon("room")}</div>
                                </TableHead>
                                <TableHead onClick={() => handleSort("value")} className="h-10 px-4 text-right align-middle font-medium text-muted-foreground cursor-pointer hover:bg-muted/50 transition-colors">
                                    <div className="flex items-center justify-end gap-1">Value {getSortIcon("value")}</div>
                                </TableHead>
                                <TableHead className="h-10 px-4 text-center align-middle font-medium text-muted-foreground">QR</TableHead>
                                <TableHead className="h-10 px-4 text-center align-middle font-medium text-muted-foreground">{showArchived ? "Restore" : "Archive"}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedAssets.filter(a => showArchived ? a.status === "Archived" : a.status !== "Archived").map((asset) => (
                                <TableRow
                                    key={asset.id}
                                    className="border-border cursor-pointer hover:bg-muted/30 transition-colors"
                                    onClick={() => onAssetClick?.(asset)}
                                >
                                    <TableCell className="p-4 align-middle font-mono text-xs font-medium text-foreground text-left">{asset.id}</TableCell>
                                    <TableCell className="p-4 align-middle text-sm text-foreground font-medium text-left">{asset.desc}</TableCell>
                                    <TableCell className="p-4 align-middle text-sm text-muted-foreground text-left">{asset.cat}</TableCell>
                                    <TableCell className="p-4 align-middle text-left">
                                        <Badge variant="outline" className={`${statusColors[asset.status]} rounded-none border-0 bg-transparent text-xs font-medium whitespace-nowrap`}>
                                            {asset.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="p-4 align-middle text-sm text-muted-foreground text-left">{asset.room}</TableCell>
                                    <TableCell className="p-4 align-middle text-sm font-medium text-foreground text-right">{formatCurrency(asset.value)}</TableCell>
                                    <TableCell className="p-4 align-middle text-center">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedAssetForQR(asset);
                                            }}
                                            className="p-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors inline-flex items-center justify-center"
                                        >
                                            <QrCode size={16} />
                                        </button>
                                    </TableCell>
                                    <TableCell className="p-4 align-middle text-center">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                archiveAssetMutation.mutate(asset.id);
                                            }}
                                            className={`p-1.5 rounded-md transition-colors inline-flex items-center justify-center ${asset.status === 'Archived' ? 'text-primary hover:bg-primary/10' : 'text-muted-foreground hover:text-destructive hover:bg-destructive/10'}`}
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
                            className="h-10 text-sm font-medium"
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                        >
                            Previous
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-10 text-sm font-medium"
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
