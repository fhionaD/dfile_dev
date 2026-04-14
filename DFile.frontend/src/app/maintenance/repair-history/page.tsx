"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClipboardList } from "lucide-react";
import { useAllocatedAssetsForMaintenance, useRepairHistory } from "@/hooks/use-maintenance";
import { useMaintenanceContext } from "@/contexts/maintenance-context";

export default function MaintenanceRepairHistoryPage() {
    const { enableGlassmorphism } = useMaintenanceContext();
    const { data: assets = [], isLoading: assetsLoading } = useAllocatedAssetsForMaintenance();
    const [assetId, setAssetId] = useState<string>("all");
    const effectiveAssetId = assetId === "all" ? undefined : assetId;
    const { data: rows = [], isLoading } = useRepairHistory(effectiveAssetId);

    const cardClassName = enableGlassmorphism
        ? "border border-white/20 bg-white/10 dark:bg-black/10 backdrop-blur-xl ring-1 ring-white/10"
        : "";

    const sortedAssets = useMemo(
        () => [...assets].sort((a, b) => (a.assetName || a.assetId).localeCompare(b.assetName || b.assetId)),
        [assets],
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-sky-500/10 flex items-center justify-center shrink-0">
                    <ClipboardList className="h-5 w-5 text-sky-600" />
                </div>
                <div>
                    <h1 className="text-xl font-semibold tracking-tight">Repair history</h1>
                    <p className="text-sm text-muted-foreground">
                        Completed on-site repairs (from finance-approved repair tickets). Filter by asset or view all.
                    </p>
                </div>
            </div>

            <Card className={`p-4 ${cardClassName}`}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
                    <p className="text-sm text-muted-foreground">Source: maintenance repair completions stored on the asset record.</p>
                    <div className="w-full sm:w-72">
                        <Select value={assetId} onValueChange={setAssetId} disabled={assetsLoading}>
                            <SelectTrigger>
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

                {isLoading ? (
                    <div className="space-y-2">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                ) : rows.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">No completed repairs recorded yet.</p>
                ) : (
                    <div className="overflow-x-auto rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>When</TableHead>
                                    <TableHead>Asset</TableHead>
                                    <TableHead>Request</TableHead>
                                    <TableHead>Condition</TableHead>
                                    <TableHead>Notes</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {rows.map((r) => (
                                    <TableRow key={r.id}>
                                        <TableCell className="whitespace-nowrap text-xs">
                                            {new Date(r.createdAt).toLocaleString()}
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm font-medium">{r.assetName ?? r.assetId}</div>
                                            {r.assetCode ? (
                                                <div className="text-xs text-muted-foreground font-mono">{r.assetCode}</div>
                                            ) : null}
                                        </TableCell>
                                        <TableCell className="font-mono text-xs">{r.requestId ?? "—"}</TableCell>
                                        <TableCell className="text-xs">
                                            {r.previousCondition} → {r.newCondition}
                                        </TableCell>
                                        <TableCell className="text-sm max-w-md whitespace-pre-wrap">{r.notes ?? "—"}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </Card>
        </div>
    );
}
