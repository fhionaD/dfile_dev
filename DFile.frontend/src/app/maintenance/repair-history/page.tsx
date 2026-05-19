"use client";

import { useMemo, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ClipboardList, Search, X } from "lucide-react";
import { useAllocatedAssetsForMaintenance, useRepairHistory, type RepairHistoryRow } from "@/hooks/use-maintenance";
import { useMaintenanceContext } from "@/contexts/maintenance-context";

export default function MaintenanceRepairHistoryPage() {
    const { enableGlassmorphism } = useMaintenanceContext();
    const { data: assets = [], isLoading: assetsLoading } = useAllocatedAssetsForMaintenance();
    const [assetId, setAssetId] = useState<string>("all");
    const [searchTerm, setSearchTerm] = useState<string>("");
    const [selectedRepair, setSelectedRepair] = useState<RepairHistoryRow | null>(null);
    
    const effectiveAssetId = assetId === "all" ? undefined : assetId;
    const { data: rows = [], isLoading } = useRepairHistory(effectiveAssetId, searchTerm || undefined);

    const cardClassName = enableGlassmorphism
        ? "border border-white/20 bg-white/10 dark:bg-black/10 backdrop-blur-xl ring-1 ring-white/10"
        : "";

    const sortedAssets = useMemo(
        () => [...assets].sort((a, b) => (a.assetName || a.assetId).localeCompare(b.assetName || b.assetId)),
        [assets],
    );

    // Clear search term
    const handleClearSearch = useCallback(() => {
        setSearchTerm("");
    }, []);

    // Format date for display
    const formatDate = (dateString: string) => {
        try {
            return new Date(dateString).toLocaleString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
            });
        } catch {
            return dateString;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-sky-500/10 flex items-center justify-center shrink-0">
                    <ClipboardList className="h-5 w-5 text-sky-600" />
                </div>
                <div>
                    <h1 className="text-xl font-semibold tracking-tight">Repair history audit log</h1>
                    <p className="text-sm text-muted-foreground">
                        Complete repair history in chronological order. Search by asset name, code, or serial number.
                    </p>
                </div>
            </div>

            <Card className={`p-6 ${cardClassName}`}>
                {/* Filters Section */}
                <div className="space-y-4 mb-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:gap-3">
                        {/* Search Input */}
                        <div className="flex-1">
                            <label className="text-sm font-medium text-foreground block mb-2">
                                Search assets
                            </label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="text"
                                    placeholder="Search by name, code, or serial number..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10 pr-10 h-10"
                                />
                                {searchTerm && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                                        onClick={handleClearSearch}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Asset Filter Dropdown */}
                        <div className="w-full lg:w-72">
                            <label className="text-sm font-medium text-foreground block mb-2">
                                Filter by allocated asset
                            </label>
                            <Select value={assetId} onValueChange={setAssetId} disabled={assetsLoading}>
                                <SelectTrigger className="h-10">
                                    <SelectValue placeholder="Filter by asset" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All assets</SelectItem>
                                    {sortedAssets.map((a) => (
                                        <SelectItem key={a.assetId} value={a.assetId}>
                                            {a.assetName || a.assetId}
                                            {a.assetCode ? ` (${a.assetCode})` : ""}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Results Summary */}
                    <div className="text-xs text-muted-foreground">
                        {isLoading ? (
                            "Loading repair history..."
                        ) : (
                            <>
                                Showing <span className="font-semibold">{rows.length}</span> repair record{rows.length !== 1 ? "s" : ""} (oldest to newest)
                                {searchTerm && <span className="ml-2">• Search: "{searchTerm}"</span>}
                            </>
                        )}
                    </div>
                </div>

                {/* Table */}
                {isLoading ? (
                    <div className="space-y-2">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                ) : rows.length === 0 ? (
                    <div className="text-center py-12">
                        <ClipboardList className="h-12 w-12 text-muted-foreground mx-auto mb-2 opacity-50" />
                        <p className="text-sm text-muted-foreground">
                            {searchTerm ? "No repairs found matching your search." : "No repair records yet."}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-lg border border-border">
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableHead className="font-semibold">Date</TableHead>
                                    <TableHead className="font-semibold">Asset name</TableHead>
                                    <TableHead className="font-semibold">Asset code</TableHead>
                                    <TableHead className="font-semibold">Category</TableHead>
                                    <TableHead className="font-semibold">Request ID</TableHead>
                                    <TableHead className="font-semibold">Condition</TableHead>
                                    <TableHead className="font-semibold">Notes</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {rows.map((r) => (
                                    <TableRow
                                        key={r.id}
                                        className="hover:bg-muted/50 cursor-pointer transition-colors"
                                        onClick={() => setSelectedRepair(r)}
                                    >
                                        <TableCell className="whitespace-nowrap text-xs font-medium">
                                            {formatDate(r.createdAt)}
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {r.assetName || <span className="text-muted-foreground">—</span>}
                                        </TableCell>
                                        <TableCell>
                                            <code className="text-xs bg-muted px-2 py-1 rounded">
                                                {r.assetCode || "—"}
                                            </code>
                                        </TableCell>
                                        <TableCell className="text-xs">
                                            {r.categoryName || <span className="text-muted-foreground">—</span>}
                                        </TableCell>
                                        <TableCell className="font-mono text-xs font-medium">
                                            {r.requestId ? (
                                                <span className="bg-blue-500/10 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">
                                                    {r.requestId}
                                                </span>
                                            ) : (
                                                <span className="text-muted-foreground">—</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-xs">
                                            <div className="flex items-center gap-1">
                                                <span className="font-medium">{r.previousCondition}</span>
                                                <span className="text-muted-foreground">→</span>
                                                <span className="font-medium">{r.newCondition}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-xs max-w-sm whitespace-pre-wrap">
                                            {r.notes ? (
                                                <p className="text-foreground">{r.notes}</p>
                                            ) : (
                                                <span className="text-muted-foreground italic">No notes</span>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </Card>

            {/* Detail Modal */}
            <Dialog open={!!selectedRepair} onOpenChange={(open) => !open && setSelectedRepair(null)}>
                <DialogContent className="max-w-md">
                    {selectedRepair && (
                        <>
                            <DialogHeader>
                                <DialogTitle>Repair details</DialogTitle>
                                <DialogDescription>
                                    Complete information for this maintenance record
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-6 mt-6 max-h-[60vh] overflow-y-auto">
                                {/* Asset Information */}
                                <div className="space-y-4">
                                    <h3 className="font-semibold text-sm text-foreground">Asset information</h3>
                                    <div className="space-y-3 text-sm">
                                        <div>
                                            <p className="text-xs text-muted-foreground font-medium">Asset name</p>
                                            <p className="font-medium">{selectedRepair.assetName || "—"}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground font-medium">Asset code</p>
                                            <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                                                {selectedRepair.assetCode || "—"}
                                            </code>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground font-medium">Category</p>
                                            <p className="font-medium">{selectedRepair.categoryName || "—"}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Repair Information */}
                                <div className="space-y-4">
                                    <h3 className="font-semibold text-sm text-foreground">Repair information</h3>
                                    <div className="space-y-3 text-sm">
                                        <div>
                                            <p className="text-xs text-muted-foreground font-medium">Date</p>
                                            <p className="font-medium">{formatDate(selectedRepair.createdAt)}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground font-medium">Request ID</p>
                                            {selectedRepair.requestId ? (
                                                <span className="inline-block bg-blue-500/10 text-blue-700 dark:text-blue-300 px-2 py-1 rounded text-xs font-mono font-medium">
                                                    {selectedRepair.requestId}
                                                </span>
                                            ) : (
                                                <p className="text-muted-foreground">—</p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Condition Log */}
                                <div className="space-y-4">
                                    <h3 className="font-semibold text-sm text-foreground">Condition status</h3>
                                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                                        <div className="flex-1 text-center">
                                            <p className="text-xs text-muted-foreground font-medium mb-1">Before</p>
                                            <p className="font-semibold text-sm">{selectedRepair.previousCondition || "—"}</p>
                                        </div>
                                        <div className="text-muted-foreground">→</div>
                                        <div className="flex-1 text-center">
                                            <p className="text-xs text-muted-foreground font-medium mb-1">After</p>
                                            <p className="font-semibold text-sm text-green-700 dark:text-green-400">{selectedRepair.newCondition || "—"}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Notes */}
                                {selectedRepair.notes && (
                                    <div className="space-y-4">
                                        <h3 className="font-semibold text-sm text-foreground">Notes</h3>
                                        <p className="text-sm text-foreground whitespace-pre-wrap bg-muted/50 p-3 rounded-lg">
                                            {selectedRepair.notes}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
