"use client";

import { useState, useMemo } from "react";
import {
    ColumnDef,
    SortingState,
    VisibilityState,
    flexRender,
    getCoreRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
} from "@tanstack/react-table";
import {
    QrCode, FileBarChart, ArrowUpDown, ArrowUp, ArrowDown,
    Archive, RotateCcw, Search, Filter, Package, SlidersHorizontal,
    ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
    MoreHorizontal, Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusText } from "@/components/ui/status-text";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    DropdownMenu, DropdownMenuCheckboxItem,
    DropdownMenuContent, DropdownMenuTrigger, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { QRCodeModal } from "@/components/modals/qr-code-modal";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { CurrencyCell } from "@/components/ui/currency-cell";
import { Asset } from "@/types/asset";
import { useAssets, useArchiveAsset, useRestoreAsset } from "@/hooks/use-assets";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Skeleton } from "@/components/ui/skeleton";

const statusVariant: Record<string, "success" | "info" | "warning" | "danger"> = {
    "In Use": "success",
    "Available": "info",
    "Maintenance": "warning",
    "Disposed": "danger",
};

function SortableHeader({ column, children }: { column: { toggleSorting: (asc: boolean) => void; getIsSorted: () => false | "asc" | "desc" }; children: React.ReactNode }) {
    const sorted = column.getIsSorted();
    return (
        <Button
            variant="ghost"
            className="h-auto p-0 text-xs font-medium text-muted-foreground hover:bg-transparent"
            onClick={() => column.toggleSorting(sorted === "asc")}
        >
            {children}
            {sorted === "asc" ? (
                <ArrowUp size={14} className="ml-1" />
            ) : sorted === "desc" ? (
                <ArrowDown size={14} className="ml-1" />
            ) : (
                <ArrowUpDown size={14} className="ml-1 opacity-50" />
            )}
        </Button>
    );
}

interface AssetTableProps {
    onAssetClick?: (asset: Asset) => void;
    readOnly?: boolean;
}

export function AssetTable({ onAssetClick, readOnly = false }: AssetTableProps) {
    const [showArchived, setShowArchived] = useState(false);
    const { data: assets = [], isLoading } = useAssets(showArchived);
    const archiveAssetMutation = useArchiveAsset();
    const restoreAssetMutation = useRestoreAsset();
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [categoryFilter, setCategoryFilter] = useState("All");
    const [sorting, setSorting] = useState<SortingState>([]);
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
    const [selectedAssetForQR, setSelectedAssetForQR] = useState<Asset | null>(null);
    const [archiveTarget, setArchiveTarget] = useState<string | null>(null);
    const [pageInput, setPageInput] = useState("");

    const uniqueCategories = useMemo(
        () => Array.from(new Set(assets.map((a) => a.categoryName).filter((v): v is string => Boolean(v)))).sort(),
        [assets],
    );

    const filteredAssets = useMemo(() => {
        return assets.filter((asset) => {
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const match =
                    asset.desc.toLowerCase().includes(q) ||
                    asset.id.toLowerCase().includes(q) ||
                    asset.model?.toLowerCase().includes(q) ||
                    asset.serialNumber?.toLowerCase().includes(q);
                if (!match) return false;
            }

            if (statusFilter !== "All" && asset.status !== statusFilter) return false;
            if (categoryFilter !== "All" && asset.categoryName !== categoryFilter) return false;

            return true;
        });
    }, [assets, searchQuery, statusFilter, categoryFilter]);

    const columns = useMemo<ColumnDef<Asset>[]>(
        () => [
            {
                accessorKey: "id",
                header: ({ column }) => <SortableHeader column={column}>Asset ID</SortableHeader>,
                cell: ({ row }) => (
                    <span className="font-mono text-xs text-muted-foreground">
                        {row.getValue("id")}
                    </span>
                ),
            },
            {
                accessorKey: "desc",
                header: ({ column }) => <SortableHeader column={column}>Asset Name</SortableHeader>,
                cell: ({ row }) => (
                    <span className="text-sm text-foreground">{row.getValue("desc")}</span>
                ),
            },
            {
                accessorKey: "categoryName",
                header: ({ column }) => <SortableHeader column={column}>Category</SortableHeader>,
                cell: ({ row }) => (
                    <span className="text-sm text-muted-foreground">{row.getValue("categoryName")}</span>
                ),
            },
            {
                accessorKey: "status",
                header: ({ column }) => <SortableHeader column={column}>Status</SortableHeader>,
                cell: ({ row }) => {
                    const status = row.getValue("status") as string;
                    return <StatusText variant={statusVariant[status] ?? "muted"}>{status}</StatusText>;
                },
            },
            {
                accessorKey: "room",
                header: ({ column }) => <SortableHeader column={column}>Room</SortableHeader>,
                cell: ({ row }) => (
                    <span className="text-sm text-muted-foreground">{row.getValue("room")}</span>
                ),
            },
            {
                accessorKey: "value",
                header: ({ column }) => (
                    <div className="flex justify-end">
                        <SortableHeader column={column}>Value</SortableHeader>
                    </div>
                ),
                cell: ({ row }) => <CurrencyCell value={row.getValue("value") as number} />,
            },
            ...(!readOnly ? [{
                id: "actions",
                enableHiding: false,
                header: () => (
                    <span className="text-xs font-medium text-muted-foreground text-center block">Actions</span>
                ),
                cell: ({ row }: { row: { original: Asset } }) => {
                    const asset = row.original;
                    const isArchived = asset.status === "Archived";
                    return (
                        <div className="text-center">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Actions" onClick={(e) => e.stopPropagation()}>
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-40">
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onAssetClick?.(asset); }} className="gap-2 cursor-pointer">
                                        <Eye className="h-4 w-4" /> View
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setSelectedAssetForQR(asset); }} className="gap-2 cursor-pointer">
                                        <QrCode className="h-4 w-4" /> QR Code
                                    </DropdownMenuItem>
                                    {isArchived ? (
                                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); restoreAssetMutation.mutate(asset.id); }} className="gap-2 cursor-pointer">
                                            <RotateCcw className="h-4 w-4" /> Restore
                                        </DropdownMenuItem>
                                    ) : (
                                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setArchiveTarget(asset.id); }} className="gap-2 cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10">
                                            <Archive className="h-4 w-4" /> Archive
                                        </DropdownMenuItem>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    );
                },
            }] : []),
        ],
        [showArchived, archiveAssetMutation, restoreAssetMutation, readOnly],
    );

    const table = useReactTable({
        data: filteredAssets,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        onSortingChange: setSorting,
        onColumnVisibilityChange: setColumnVisibility,
        state: { sorting, columnVisibility },
        initialState: { pagination: { pageSize: 10 } },
    });

    const handleExportCSV = () => {
        const rows = table.getSortedRowModel().rows.map((row) => {
            const a = row.original;
            return [a.id, `"${a.desc.replace(/"/g, '""')}"`, a.categoryName, a.status, a.room, a.value.toFixed(2)];
        });
        const csv = [
            "Asset ID,Asset Name,Category,Status,Room,Value",
            ...rows.map((r) => r.join(",")),
        ].join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `fleet_report_${new Date().toISOString().split("T")[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handlePageInputSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            const page = Number(pageInput);
            if (page >= 1 && page <= table.getPageCount()) {
                table.setPageIndex(page - 1);
            }
            setPageInput("");
        }
    };

    if (isLoading) {
        return (
            <div className="rounded-md border overflow-hidden">
                <div className="p-6">
                    <div className="flex justify-between items-center">
                        <Skeleton className="h-5 w-40" />
                        <Skeleton className="h-9 w-28" />
                    </div>
                </div>
                <div className="px-6 pb-6 flex gap-3">
                    <Skeleton className="h-10 flex-1" />
                    <Skeleton className="h-10 w-36" />
                    <Skeleton className="h-10 w-36" />
                </div>
                <div className="divide-y divide-border/40">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="px-6 py-4 flex gap-4 items-center">
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="h-4 flex-1" />
                            <Skeleton className="h-6 w-16 rounded-full" />
                            <Skeleton className="h-4 w-20" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <QRCodeModal
                open={!!selectedAssetForQR}
                onOpenChange={(open) => !open && setSelectedAssetForQR(null)}
                asset={selectedAssetForQR}
            />

            <div className="rounded-md border overflow-hidden">
                {/* Toolbar */}
                <div className="p-6 flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
                    <div className="flex flex-1 flex-wrap gap-3 w-full lg:w-auto items-center">
                        <div className="relative flex-1 min-w-[200px] max-w-sm">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                            <Input
                                placeholder="Search assets..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 h-10"
                                aria-label="Search assets"
                            />
                        </div>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[150px] h-10">
                                <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="All">All Status</SelectItem>
                                {Object.keys(statusVariant).map((s) => (
                                    <SelectItem key={s} value={s}>{s}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                            <SelectTrigger className="w-[150px] h-10">
                                <Package className="w-4 h-4 mr-2 text-muted-foreground" />
                                <SelectValue placeholder="Category" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="All">All Categories</SelectItem>
                                {uniqueCategories.map((cat) => (
                                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-center gap-2 w-full lg:w-auto justify-end flex-wrap">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="h-10">
                                    <SlidersHorizontal className="mr-2 h-4 w-4" />
                                    Columns
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                                {table
                                    .getAllColumns()
                                    .filter((col) => col.getCanHide())
                                    .map((column) => (
                                        <DropdownMenuCheckboxItem
                                            key={column.id}
                                            className="capitalize"
                                            checked={column.getIsVisible()}
                                            onCheckedChange={(v) => column.toggleVisibility(!!v)}
                                        >
                                            {column.id}
                                        </DropdownMenuCheckboxItem>
                                    ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <Button variant="outline" size="sm" className="h-10" onClick={handleExportCSV}>
                            <FileBarChart size={16} className="mr-2" />
                            Export
                        </Button>
                        {!readOnly && (
                            <Button
                                variant={showArchived ? "default" : "outline"}
                                size="sm"
                                className="h-10"
                                onClick={() => setShowArchived(!showArchived)}
                            >
                                {showArchived ? (
                                    <>
                                        <RotateCcw size={16} className="mr-2" />
                                        Active ({assets.filter((a) => a.status !== "Archived").length})
                                    </>
                                ) : (
                                    <>
                                        <Archive size={16} className="mr-2" />
                                        Archived ({assets.filter((a) => a.status === "Archived").length})
                                    </>
                                )}
                            </Button>
                        )}
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <Table className="w-full">
                        <TableHeader>
                            {table.getHeaderGroups().map((headerGroup) => (
                                <TableRow key={headerGroup.id} className="hover:bg-transparent border-y border-border/40">
                                    {headerGroup.headers.map((header) => (
                                        <TableHead key={header.id}>
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(header.column.columnDef.header, header.getContext())}
                                        </TableHead>
                                    ))}
                                </TableRow>
                            ))}
                        </TableHeader>
                        <TableBody>
                            {table.getRowModel().rows?.length ? (
                                table.getRowModel().rows.map((row) => (
                                    <TableRow
                                        key={row.id}
                                        className="cursor-pointer"
                                        onClick={() => onAssetClick?.(row.original)}
                                    >
                                        {row.getVisibleCells().map((cell) => (
                                            <TableCell key={cell.id}>
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow className="hover:bg-transparent">
                                    <TableCell
                                        colSpan={columns.length}
                                        className="h-32 text-center text-muted-foreground"
                                    >
                                        {showArchived ? "No archived assets yet" : "No assets match your search"}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination Footer */}
                <div className="px-6 py-4 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-4 bg-muted/20">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="font-medium">
                            {table.getFilteredRowModel().rows.length === 0
                                ? "No results"
                                : `${table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}–${Math.min(
                                      (table.getState().pagination.pageIndex + 1) *
                                          table.getState().pagination.pageSize,
                                      table.getFilteredRowModel().rows.length,
                                  )} of ${table.getFilteredRowModel().rows.length}`}
                        </span>
                        <div className="flex items-center gap-2">
                            <span>Rows:</span>
                            <Select
                                value={String(table.getState().pagination.pageSize)}
                                onValueChange={(v) => table.setPageSize(Number(v))}
                            >
                                <SelectTrigger className="h-8 w-[68px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {[5, 10, 20, 50].map((s) => (
                                        <SelectItem key={s} value={String(s)}>
                                            {s}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground font-medium">
                            Page {table.getState().pagination.pageIndex + 1} of{" "}
                            {table.getPageCount() || 1}
                        </span>
                        <Input
                            placeholder="Go to"
                            value={pageInput}
                            onChange={(e) => setPageInput(e.target.value)}
                            onKeyDown={handlePageInputSubmit}
                            className="h-8 w-16 text-center"
                            aria-label="Go to page"
                        />
                        <div className="flex items-center gap-1">
                            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()} aria-label="First page">
                                <ChevronsLeft className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} aria-label="Previous page">
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} aria-label="Next page">
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => table.setPageIndex(table.getPageCount() - 1)} disabled={!table.getCanNextPage()} aria-label="Last page">
                                <ChevronsRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <ConfirmDialog
                open={archiveTarget !== null}
                onOpenChange={(open) => { if (!open) setArchiveTarget(null); }}
                title="Archive Asset"
                description="Are you sure you want to archive this asset? It can be restored later from the archive view."
                confirmLabel="Archive"
                confirmVariant="destructive"
                onConfirm={async () => {
                    if (archiveTarget) {
                        await archiveAssetMutation.mutateAsync(archiveTarget);
                        setArchiveTarget(null);
                    }
                }}
                isLoading={archiveAssetMutation.isPending}
            />
        </div>
    );
}
