"use client";

import { useState, useMemo, useEffect } from "react";
import {
    ColumnDef,
    SortingState,
    flexRender,
    getCoreRowModel,
    getSortedRowModel,
    useReactTable,
} from "@tanstack/react-table";
import {
    QrCode, FileBarChart, ArrowUpDown, ArrowUp, ArrowDown,
    Archive, RotateCcw, Search, Filter, Package, Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QRCodeModal } from "@/components/modals/qr-code-modal";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { TablePagination } from "@/components/ui/table-pagination";
import { CurrencyCell } from "@/components/ui/currency-cell";
import { Asset } from "@/types/asset";
import { useAssetsPaged, useArchiveAsset, useRestoreAsset } from "@/hooks/use-assets";
import { useCategories } from "@/hooks/use-categories";
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
    /** Opens the register-new-asset flow (inventory only). */
    onRegisterAsset?: () => void;
    readOnly?: boolean;
}

export function AssetTable({ onAssetClick, onRegisterAsset, readOnly = false }: AssetTableProps) {
    const [showArchived, setShowArchived] = useState(false);
    const [pageIndex, setPageIndex] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [categoryFilter, setCategoryFilter] = useState("All");
    const [sorting, setSorting] = useState<SortingState>([]);
    const [selectedAssetForQR, setSelectedAssetForQR] = useState<Asset | null>(null);
    const [archiveTarget, setArchiveTarget] = useState<string | null>(null);

    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(searchQuery), 300);
        return () => clearTimeout(t);
    }, [searchQuery]);

    useEffect(() => {
        setPageIndex(0);
    }, [showArchived, debouncedSearch, statusFilter, categoryFilter]);

    const { data: categories = [] } = useCategories(false);
    const uniqueCategories = useMemo(
        () => categories.map((c) => c.categoryName).filter(Boolean).sort(),
        [categories],
    );

    const page = pageIndex + 1;
    const { data: paged, isLoading } = useAssetsPaged(showArchived, page, pageSize, {
        q: debouncedSearch || undefined,
        status: statusFilter,
        category: categoryFilter,
    });
    const assets = paged?.data ?? [];
    const totalCount = paged?.totalCount ?? 0;

    useEffect(() => {
        if (paged && paged.page !== pageIndex + 1) {
            setPageIndex(Math.max(0, paged.page - 1));
        }
    }, [paged, pageIndex]);

    const archiveAssetMutation = useArchiveAsset();
    const restoreAssetMutation = useRestoreAsset();

    const columns = useMemo<ColumnDef<Asset>[]>(
        () => [
            {
                accessorKey: "assetCode",
                header: ({ column }) => <SortableHeader column={column}>Asset ID</SortableHeader>,
                cell: ({ row }) => (
                    <span className="font-mono text-xs text-muted-foreground">
                        {row.original.assetCode || row.original.id}
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
                        <div className="flex items-center justify-center gap-1">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                title="QR Code"
                                onClick={(e) => { e.stopPropagation(); setSelectedAssetForQR(asset); }}
                            >
                                <QrCode className="h-4 w-4" />
                            </Button>
                            {isArchived ? (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-emerald-600 hover:bg-emerald-500/10"
                                    title="Restore"
                                    onClick={(e) => { e.stopPropagation(); restoreAssetMutation.mutate(asset.id); }}
                                >
                                    <RotateCcw className="h-4 w-4" />
                                </Button>
                            ) : (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                    title="Archive"
                                    onClick={(e) => { e.stopPropagation(); setArchiveTarget(asset.id); }}
                                >
                                    <Archive className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    );
                },
            }] : []),
        ],
        [restoreAssetMutation, readOnly],
    );

    /* eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table useReactTable is intentionally excluded from React Compiler memoization */
    const table = useReactTable({
        data: assets,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        onSortingChange: setSorting,
        state: { sorting },
    });

    const handleExportCSV = () => {
        const rows = table.getSortedRowModel().rows.map((row) => {
            const a = row.original;
            return [a.assetCode || a.id, `"${a.desc.replace(/"/g, '""')}"`, a.categoryName, a.status, a.room, a.value.toFixed(2)];
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
                        {!readOnly && onRegisterAsset && (
                            <Button
                                type="button"
                                size="sm"
                                className="h-10"
                                onClick={onRegisterAsset}
                                aria-label="Register new asset"
                            >
                                <Plus size={16} className="mr-2" />
                                Register Asset
                            </Button>
                        )}
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
                                        View active
                                    </>
                                ) : (
                                    <>
                                        <Archive size={16} className="mr-2" />
                                        View archived
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

                <TablePagination
                    totalItems={totalCount}
                    pageSize={paged?.pageSize ?? pageSize}
                    pageIndex={pageIndex}
                    onPageChange={setPageIndex}
                    onPageSizeChange={setPageSize}
                    pageSizeOptions={[5, 10, 20, 50]}
                />
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
