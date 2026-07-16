"use client";

import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Search, Package, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CurrencyCell } from "@/components/ui/currency-cell";
import { useAssets } from "@/hooks/use-assets";
import * as XLSX from 'xlsx';

export default function TenantDisposalsPage() {
    const { data: assets = [], isLoading } = useAssets(false, { includeDisposed: true });
    const [searchQuery, setSearchQuery] = useState("");

    const disposedAssets = useMemo(() => {
        return assets.filter((a) => a.archived || a.status === "Disposed" || a.status === "Written Off" || a.status === "For Replacement");
    }, [assets]);

    const filtered = useMemo(() => {
        if (!searchQuery) return disposedAssets;
        const q = searchQuery.toLowerCase();
        return disposedAssets.filter(
            (a) =>
                (a.desc ?? "").toLowerCase().includes(q) ||
                (a.assetCode ?? "").toLowerCase().includes(q) ||
                (a.categoryName ?? "").toLowerCase().includes(q) ||
                (a.serialNumber ?? "").toLowerCase().includes(q),
        );
    }, [disposedAssets, searchQuery]);

    const totalOriginalValue = filtered.reduce((sum, a) => sum + (a.purchasePrice ?? a.value ?? 0), 0);
    const totalBookValue = filtered.reduce((sum, a) => sum + (a.currentBookValue ?? 0), 0);
    const totalWriteOff = totalOriginalValue - totalBookValue;

    const handleExport = (data: typeof filtered) => {
        const exportData = data.map(a => ({
            'Asset Code': a.assetCode ?? a.id ?? '',
            'Description': a.desc ?? '',
            'Category': a.categoryName ?? '',
            'Purchase Date': a.purchaseDate ? new Date(a.purchaseDate).toLocaleDateString() : '',
            'Original Value': a.purchasePrice ?? a.value ?? 0,
            'Book Value': a.currentBookValue ?? 0,
            'Write-Off Amount': (a.purchasePrice ?? a.value ?? 0) - (a.currentBookValue ?? 0),
        }));

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Disposed Assets');

        worksheet['!cols'] = [
            { wch: 12 },
            { wch: 25 },
            { wch: 15 },
            { wch: 14 },
            { wch: 15 },
            { wch: 15 },
            { wch: 15 },
        ];

        XLSX.writeFile(workbook, `disposed-assets-${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
                    <Trash2 className="h-5 w-5 text-red-600" />
                </div>
                <div>
                    <h1 className="text-xl font-semibold tracking-tight">Asset disposals</h1>
                    <p className="text-sm text-muted-foreground">
                        Disposed, written-off, and for-replacement assets for audit and lifecycle review.
                    </p>
                </div>
            </div>

            <section className="grid gap-4 sm:grid-cols-2">
                <Card>
                    <div className="p-5 space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">Records</p>
                            <Package className="h-4 w-4 text-muted-foreground" />
                        </div>
                        {isLoading ? <Skeleton className="h-8 w-16" /> : <p className="text-2xl font-bold">{filtered.length}</p>}
                    </div>
                </Card>
                <Card>
                    <div className="p-5 space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">Original value</p>
                            <span className="text-lg font-bold text-muted-foreground">₱</span>
                        </div>
                        {isLoading ? <Skeleton className="h-8 w-24" /> : <CurrencyCell value={totalOriginalValue} className="text-2xl font-bold" />}
                    </div>
                </Card>
                <Card>
                    <div className="p-5 space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">Total Original Value</p>
                            <span className="text-lg font-bold text-muted-foreground">₱</span>
                        </div>
                        {isLoading ? <Skeleton className="h-8 w-24" /> : <CurrencyCell value={totalOriginalValue} className="text-2xl font-bold" />}
                    </div>
                </Card>
            </section>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold">Disposal registry</h2>
                    <span className="text-sm text-muted-foreground">({filtered.length})</span>
                </div>
                <div className="flex gap-2 flex-col sm:flex-row sm:w-auto w-full">
                    <div className="relative flex-1 sm:flex-none sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Search disposals..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleExport(filtered)} className="gap-2 whitespace-nowrap">
                        <Download className="h-4 w-4" />
                        Export
                    </Button>
                </div>
            </div>

            {isLoading ? (
                <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground rounded-md border">
                    <Trash2 className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p>No disposed or replacement-pending assets found</p>
                </div>
            ) : (
                <div className="rounded-md border overflow-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Asset code</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Purchase date</TableHead>
                                <TableHead className="text-right">Original value</TableHead>
                                <TableHead className="text-right">Book value</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.map((a) => (
                                <TableRow key={a.id}>
                                    <TableCell className="font-mono text-sm">{a.assetCode ?? a.id ?? "—"}</TableCell>
                                    <TableCell className="font-medium max-w-[200px] truncate">{a.desc}</TableCell>
                                    <TableCell>{a.categoryName ?? "—"}</TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {a.purchaseDate ? new Date(a.purchaseDate).toLocaleDateString() : "—"}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <CurrencyCell value={a.purchasePrice ?? a.value ?? 0} />
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <CurrencyCell value={a.currentBookValue ?? 0} />
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
