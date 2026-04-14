"use client";

import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { StatusText } from "@/components/ui/status-text";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Search, Package, DollarSign } from "lucide-react";
import { CurrencyCell } from "@/components/ui/currency-cell";
import { useAssets } from "@/hooks/use-assets";

export default function DisposalsPage() {
    const { data: assets = [], isLoading } = useAssets(false, { includeDisposed: true });
    const [searchQuery, setSearchQuery] = useState("");

    const disposedAssets = useMemo(() => {
        return assets.filter(a => a.archived || a.status === "Disposed" || a.status === "Written Off");
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

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
                    <Trash2 className="h-5 w-5 text-red-600" />
                </div>
                <div>
                    <h1 className="text-xl font-semibold tracking-tight">Asset Disposals</h1>
                    <p className="text-sm text-muted-foreground">Track disposed and written-off assets</p>
                </div>
            </div>

            {/* Summary Cards */}
            <section className="grid gap-4 sm:grid-cols-3">
                <Card>
                    <div className="p-5 space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">Disposed Assets</p>
                            <Package className="h-4 w-4 text-muted-foreground" />
                        </div>
                        {isLoading ? <Skeleton className="h-8 w-16" /> : <p className="text-2xl font-bold">{filtered.length}</p>}
                    </div>
                </Card>
                <Card>
                    <div className="p-5 space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">Original Value</p>
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </div>
                        {isLoading ? <Skeleton className="h-8 w-24" /> : <CurrencyCell value={totalOriginalValue} className="text-2xl font-bold" />}
                    </div>
                </Card>
                <Card>
                    <div className="p-5 space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">Write-Off Amount</p>
                            <DollarSign className="h-4 w-4 text-red-600" />
                        </div>
                        {isLoading ? <Skeleton className="h-8 w-24" /> : <CurrencyCell value={totalWriteOff} className="text-2xl font-bold text-red-600" />}
                    </div>
                </Card>
            </section>

            {/* Disposal Table */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold">Disposal Registry</h2>
                    <span className="text-sm text-muted-foreground">({filtered.length})</span>
                </div>
                <div className="relative sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search disposals..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
                </div>
            </div>

            {isLoading ? (
                <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground rounded-md border">
                    <Trash2 className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p>No disposed assets found</p>
                </div>
            ) : (
                <div className="rounded-md border overflow-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Asset code</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Purchase Date</TableHead>
                                <TableHead className="text-right">Original Value</TableHead>
                                <TableHead className="text-right">Book Value</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.map(a => (
                                <TableRow key={a.id}>
                                    <TableCell className="font-mono text-sm">{a.assetCode ?? a.id ?? "—"}</TableCell>
                                    <TableCell className="font-medium max-w-[200px] truncate">{a.desc}</TableCell>
                                    <TableCell>{a.categoryName ?? "—"}</TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {a.purchaseDate ? new Date(a.purchaseDate).toLocaleDateString() : "—"}
                                    </TableCell>
                                    <TableCell className="text-right"><CurrencyCell value={a.purchasePrice ?? a.value ?? 0} /></TableCell>
                                    <TableCell className="text-right"><CurrencyCell value={a.currentBookValue ?? 0} /></TableCell>
                                    <TableCell>
                                        <StatusText variant={a.archived ? "muted" : "danger"}>{a.status}</StatusText>
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
