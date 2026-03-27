"use client";

import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { StatusText } from "@/components/ui/status-text";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CalendarClock, Search, Clock, CheckCircle2, Calendar, Wrench, AlertCircle, Plus, RefreshCw } from "lucide-react";
import { useAllocatedAssetsForMaintenance, useMaintenanceRecords, useUpdateMaintenanceStatus, useUpdateMaintenanceRecord } from "@/hooks/use-maintenance";
import { useAssets } from "@/hooks/use-assets";
import { CreateMaintenanceModal } from "@/components/modals/create-maintenance-modal";
import { MaintenanceDetailsModal } from "@/components/modals/maintenance-details-modal";
import { InspectionDiagnosisModal } from "@/components/modals/inspection-diagnosis-modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { getErrorMessage } from "@/lib/api";
import { MaintenanceRecord } from "@/types/asset";

export default function SchedulesPage() {
    const { data: records = [], isLoading } = useMaintenanceRecords();
    const { data: assets = [] } = useAssets();
    const {
        data: allocatedAssets = [],
        isLoading: assetsLoading,
        isError: assetsError,
        error: assetsErr,
        refetch: refetchAllocated,
    } = useAllocatedAssetsForMaintenance();
    const [searchQuery, setSearchQuery] = useState("");
    const [frequencyFilter, setFrequencyFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    const [selectedAssetIdForSchedule, setSelectedAssetIdForSchedule] = useState<string | null>(null);
    const [advanceTarget, setAdvanceTarget] = useState<{ id: string; nextStatus: string } | null>(null);
    const NEXT_STATUS: Record<string, string> = {
        "Open": "Inspection",
        "Inspection": "Quoted",
        "Quoted": "In Progress",
        "In Progress": "Completed",
        "Scheduled": "Inspection",
        "Pending": "Inspection",
    };
    const [selectedRecord, setSelectedRecord] = useState<MaintenanceRecord | null>(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [inspectionTarget, setInspectionTarget] = useState<MaintenanceRecord | null>(null);
    const updateStatusMutation = useUpdateMaintenanceStatus();
    const updateRecordMutation = useUpdateMaintenanceRecord();

    // Helper: get asset display name
    const getAssetDisplay = (assetId: string) => {
        const asset = assets.find(a => a.id === assetId);
        if (asset) return { name: asset.desc || assetId, code: asset.assetCode || asset.tagNumber || "" };
        // Also try allocatedAssets
        const alloc = allocatedAssets.find(a => a.assetId === assetId);
        if (alloc) return { name: alloc.assetName || assetId, code: alloc.assetCode || alloc.tagNumber || "" };
        return { name: assetId, code: "" };
    };

    const scheduledRecords = useMemo(() => {
        return records.filter(r => !r.isArchived && ((r.frequency && r.frequency !== "One-time") || r.status === "Scheduled"));
    }, [records]);

    const filtered = useMemo(() => {
        return scheduledRecords.filter(r => {
            if (frequencyFilter !== "all" && r.frequency !== frequencyFilter) return false;
            if (statusFilter !== "all" && r.status !== statusFilter) return false;
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const assetInfo = getAssetDisplay(r.assetId);
                return r.description.toLowerCase().includes(q) ||
                    r.assetId.toLowerCase().includes(q) ||
                    assetInfo.name.toLowerCase().includes(q) ||
                    assetInfo.code.toLowerCase().includes(q) ||
                    (r.assetName || "").toLowerCase().includes(q) ||
                    (r.assetCode || "").toLowerCase().includes(q);
            }
            return true;
        });
    }, [scheduledRecords, searchQuery, frequencyFilter, statusFilter, assets, allocatedAssets]);

    const filteredAllocatedAssets = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return allocatedAssets;

        return allocatedAssets.filter(a =>
            (a.assetCode || "").toLowerCase().includes(q) ||
            (a.tagNumber || "").toLowerCase().includes(q) ||
            (a.assetName || "").toLowerCase().includes(q) ||
            (a.categoryName || "").toLowerCase().includes(q) ||
            (a.roomName || "").toLowerCase().includes(q) ||
            (a.roomCode || "").toLowerCase().includes(q)
        );
    }, [allocatedAssets, searchQuery]);

    const scheduledCount = scheduledRecords.filter(r => r.status === "Scheduled" || r.status === "Pending" || r.status === "Open").length;
    const inProgressCount = scheduledRecords.filter(r => r.status === "In Progress" || r.status === "Inspection" || r.status === "Quoted").length;
    const completedCount = scheduledRecords.filter(r => r.status === "Completed").length;

    const priorityVariant: Record<string, "danger" | "warning" | "info" | "muted"> = {
        High: "danger",
        Medium: "warning",
        Low: "info",
    };

    const statusVariant: Record<string, "info" | "success" | "warning" | "muted"> = {
        Open: "info",
        Inspection: "warning",
        Quoted: "muted",
        Scheduled: "info",
        Pending: "warning",
        "In Progress": "warning",
        Completed: "success",
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <CalendarClock className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-xl font-semibold tracking-tight">Maintenance Schedules</h1>
                        <p className="text-sm text-muted-foreground">Recurring and scheduled maintenance plans</p>
                    </div>
                </div>
            </div>

            {/* Summary */}
            <section className="grid gap-4 sm:grid-cols-3">
                <Card>
                    <div className="p-5 space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">Scheduled / Pending</p>
                            <Calendar className="h-4 w-4 text-blue-600" />
                        </div>
                        {isLoading ? <Skeleton className="h-8 w-16" /> : <p className="text-2xl font-bold text-blue-600">{scheduledCount}</p>}
                    </div>
                </Card>
                <Card>
                    <div className="p-5 space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">In Progress</p>
                            <Clock className="h-4 w-4 text-amber-600" />
                        </div>
                        {isLoading ? <Skeleton className="h-8 w-16" /> : <p className="text-2xl font-bold text-amber-600">{inProgressCount}</p>}
                    </div>
                </Card>
                <Card>
                    <div className="p-5 space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">Completed</p>
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        </div>
                        {isLoading ? <Skeleton className="h-8 w-16" /> : <p className="text-2xl font-bold text-emerald-600">{completedCount}</p>}
                    </div>
                </Card>
            </section>

            {/* Upcoming Schedule – Next 30 Days */}
            {(() => {
                const now = new Date();
                const thirtyDaysLater = new Date(now);
                thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);

                const upcoming = scheduledRecords
                    .filter(r => r.status !== "Completed" && r.startDate)
                    .filter(r => {
                        const d = new Date(r.startDate!);
                        return d >= now && d <= thirtyDaysLater;
                    })
                    .sort((a, b) => new Date(a.startDate!).getTime() - new Date(b.startDate!).getTime())
                    .slice(0, 5);

                if (upcoming.length === 0 && !isLoading) return null;

                return (
                    <Card>
                        <div className="p-5 space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                                    <CalendarClock className="h-4 w-4 text-primary" /> Upcoming in 30 Days
                                </h3>
                                <span className="text-xs text-muted-foreground">{upcoming.length} task(s)</span>
                            </div>
                            {isLoading ? (
                                <div className="space-y-2">{[1, 2].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
                            ) : (
                                <div className="space-y-2">
                                    {upcoming.map(r => {
                                        const startDate = new Date(r.startDate!);
                                        const daysUntil = Math.ceil((startDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                                        const assetInfo = getAssetDisplay(r.assetId);
                                        return (
                                            <div
                                                key={r.id}
                                                className="flex items-center gap-3 p-2.5 bg-muted/30 rounded-lg border border-border/50 cursor-pointer hover:bg-muted/60 transition-colors"
                                                onClick={() => { setSelectedRecord(r); setIsDetailsModalOpen(true); }}
                                            >
                                                <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                                                    daysUntil <= 3 ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                                                    daysUntil <= 7 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                                                    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                                }`}>
                                                    {daysUntil === 0 ? "!" : `${daysUntil}d`}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium truncate">{r.description}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {assetInfo.code && <span className="font-mono">{assetInfo.code} · </span>}
                                                        {startDate.toLocaleDateString()} · {r.frequency} · {r.priority}
                                                    </p>
                                                </div>
                                                <StatusText variant={statusVariant[r.status] ?? "muted"}>{r.status}</StatusText>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </Card>
                );
            })()}

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search by asset, description..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
                </div>
                <Select value={frequencyFilter} onValueChange={setFrequencyFilter}>
                    <SelectTrigger className="w-[160px]"><SelectValue placeholder="Frequency" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Frequencies</SelectItem>
                        <SelectItem value="Daily">Daily</SelectItem>
                        <SelectItem value="Weekly">Weekly</SelectItem>
                        <SelectItem value="Monthly">Monthly</SelectItem>
                        <SelectItem value="Quarterly">Quarterly</SelectItem>
                        <SelectItem value="Yearly">Yearly</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="Open">Open</SelectItem>
                        <SelectItem value="Scheduled">Scheduled</SelectItem>
                        <SelectItem value="In Progress">In Progress</SelectItem>
                        <SelectItem value="Completed">Completed</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Schedules Table */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <h2 className="text-lg font-semibold">Maintenance Schedules</h2>
                        <Badge variant="secondary" className="font-mono text-xs">{filtered.length}</Badge>
                    </div>
                </div>

                {isLoading ? (
                    <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground rounded-md border">
                        <CalendarClock className="h-12 w-12 mx-auto mb-4 opacity-20" />
                        <p>No scheduled maintenance found</p>
                        <p className="text-xs mt-1">Schedule maintenance from the allocated assets below</p>
                    </div>
                ) : (
                    <div className="rounded-md border overflow-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Asset</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead>Frequency</TableHead>
                                    <TableHead>Priority</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Start Date</TableHead>
                                    <TableHead>End Date</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filtered.map(r => {
                                    const assetInfo = getAssetDisplay(r.assetId);
                                    return (
                                        <TableRow
                                            key={r.id}
                                            className="cursor-pointer hover:bg-muted/50"
                                            onClick={() => { setSelectedRecord(r); setIsDetailsModalOpen(true); }}
                                        >
                                            <TableCell>
                                                <div className="space-y-0.5">
                                                    <span className="text-sm font-medium block truncate max-w-[180px]">
                                                        {r.assetName || assetInfo.name}
                                                    </span>
                                                    {(r.assetCode || assetInfo.code) && (
                                                        <span className="text-xs text-muted-foreground font-mono block">
                                                            {r.assetCode || assetInfo.code}
                                                        </span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-medium max-w-[200px] truncate">{r.description}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1.5">
                                                    <RefreshCw className="h-3 w-3 text-muted-foreground" />
                                                    <span className="text-sm">{r.frequency ?? "One-time"}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <StatusText variant={priorityVariant[r.priority] ?? "muted"}>{r.priority}</StatusText>
                                            </TableCell>
                                            <TableCell>
                                                <StatusText variant={statusVariant[r.status] ?? "muted"}>{r.status}</StatusText>
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground tabular-nums">
                                                {r.startDate ? new Date(r.startDate).toLocaleDateString() : "—"}
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground tabular-nums">
                                                {r.endDate ? new Date(r.endDate).toLocaleDateString() : "—"}
                                            </TableCell>
                                            <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                                                {(() => {
                                                    const nextStatus = NEXT_STATUS[r.status];
                                                    if (!nextStatus) return <StatusText variant="success">Done</StatusText>;

                                                    const needsInspection = nextStatus === "Inspection";
                                                    const needsQuotation = nextStatus === "Quoted";

                                                    return (
                                                        <Button
                                                            size="sm"
                                                            variant={nextStatus === "Completed" ? "default" : "outline"}
                                                            onClick={() => {
                                                                if (needsInspection) {
                                                                    setInspectionTarget(r);
                                                                } else if (needsQuotation) {
                                                                    setSelectedRecord(r);
                                                                    setIsDetailsModalOpen(true);
                                                                } else {
                                                                    setAdvanceTarget({ id: r.id, nextStatus });
                                                                }
                                                            }}
                                                            className={nextStatus === "Completed" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}
                                                        >
                                                            {nextStatus}
                                                        </Button>
                                                    );
                                                })()}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </div>

            {/* Allocated Assets Table */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <h2 className="text-lg font-semibold">Allocated Assets</h2>
                        <Badge variant="secondary" className="font-mono text-xs">{filteredAllocatedAssets.length}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">Click &quot;Schedule&quot; to create preventive maintenance</p>
                </div>

                {assetsLoading ? (
                    <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
                ) : assetsError ? (
                    <div className="rounded-md border border-destructive/40 bg-destructive/5 p-6 text-center space-y-3">
                        <AlertCircle className="h-10 w-10 mx-auto text-destructive opacity-80" />
                        <p className="font-medium text-destructive">Could not load allocated assets</p>
                        <p className="text-sm text-muted-foreground max-w-md mx-auto">{getErrorMessage(assetsErr, "Check that the API is running and NEXT_PUBLIC_API_URL is set for next dev.")}</p>
                        <Button variant="outline" size="sm" onClick={() => refetchAllocated()}>Retry</Button>
                    </div>
                ) : filteredAllocatedAssets.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground rounded-md border">
                        <Wrench className="h-12 w-12 mx-auto mb-4 opacity-20" />
                        <p>No allocated assets found</p>
                    </div>
                ) : (
                    <div className="rounded-md border overflow-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Asset</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead>Allocated Room</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredAllocatedAssets.map(a => (
                                    <TableRow key={`${a.assetId}-${a.roomId ?? "no-room"}-${a.allocatedAt ?? "no-time"}`}>
                                        <TableCell className="font-medium">
                                            <div className="flex flex-col">
                                                <span>{a.assetName || a.assetId}</span>
                                                <span className="text-xs text-muted-foreground font-mono">{a.assetCode || a.tagNumber || a.assetId}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>{a.categoryName || "—"}</TableCell>
                                        <TableCell>{a.roomCode ? `${a.roomCode}${a.roomName ? ` (${a.roomName})` : ""}` : "—"}</TableCell>
                                        <TableCell>
                                            <StatusText variant="info">Allocated</StatusText>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                size="sm"
                                                onClick={() => {
                                                    setSelectedAssetIdForSchedule(a.assetId);
                                                    setIsScheduleModalOpen(true);
                                                }}
                                            >
                                                <Plus className="h-4 w-4 mr-1.5" />
                                                Schedule
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </div>

            <CreateMaintenanceModal
                key={selectedAssetIdForSchedule ?? "schedule-maintenance-modal"}
                open={isScheduleModalOpen}
                onOpenChange={(open) => {
                    setIsScheduleModalOpen(open);
                    if (!open) setSelectedAssetIdForSchedule(null);
                }}
                defaultAssetId={selectedAssetIdForSchedule}
            />

            <MaintenanceDetailsModal
                open={isDetailsModalOpen}
                onOpenChange={setIsDetailsModalOpen}
                record={selectedRecord}
                onEdit={() => {
                    setIsDetailsModalOpen(false);
                    if (selectedRecord) {
                        setSelectedAssetIdForSchedule(selectedRecord.assetId);
                        setIsScheduleModalOpen(true);
                    }
                }}
            />

            <InspectionDiagnosisModal
                open={inspectionTarget !== null}
                onOpenChange={(open) => { if (!open) setInspectionTarget(null); }}
                assetName={inspectionTarget?.assetName || inspectionTarget?.assetId}
                isLoading={updateRecordMutation.isPending}
                onSubmit={async ({ inspectionNotes, diagnosisOutcome }) => {
                    if (!inspectionTarget) return;
                    await updateRecordMutation.mutateAsync({
                        id: inspectionTarget.id,
                        payload: {
                            assetId: inspectionTarget.assetId,
                            description: inspectionTarget.description,
                            status: "Inspection",
                            priority: inspectionTarget.priority,
                            type: inspectionTarget.type,
                            frequency: inspectionTarget.frequency,
                            startDate: inspectionTarget.startDate,
                            endDate: inspectionTarget.endDate,
                            cost: inspectionTarget.cost,
                            attachments: inspectionTarget.attachments,
                            inspectionNotes,
                            diagnosisOutcome,
                            dateReported: inspectionTarget.dateReported,
                        },
                    });
                    setInspectionTarget(null);
                }}
            />

            <ConfirmDialog
                open={advanceTarget !== null}
                onOpenChange={(open) => { if (!open) setAdvanceTarget(null); }}
                title={`Move to ${advanceTarget?.nextStatus || ""}`}
                description={`Are you sure you want to advance this maintenance task to "${advanceTarget?.nextStatus}"?`}
                confirmLabel={`Move to ${advanceTarget?.nextStatus || ""}`}
                onConfirm={async () => {
                    if (advanceTarget) {
                        await updateStatusMutation.mutateAsync({ id: advanceTarget.id, status: advanceTarget.nextStatus });
                        setAdvanceTarget(null);
                    }
                }}
                isLoading={updateStatusMutation.isPending}
            />
        </div>
    );
}
