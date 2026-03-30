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

// ── Occurrence expansion ──────────────────────────────────────────────────────

type ScheduleOccurrence = MaintenanceRecord & {
    /** Original record ID — used for all mutations and modal state. */
    parentId: string;
    /** The specific date this occurrence falls on. */
    occurrenceDate: string;
    /** 0-based index within the expanded series. */
    occurrenceIndex: number;
    /** Total occurrences generated from this parent record. */
    totalOccurrences: number;
};

const ADVANCE_PER_FREQUENCY: Record<string, (d: Date) => Date> = {
    Daily:     d => { const n = new Date(d); n.setDate(n.getDate() + 1); return n; },
    Weekly:    d => { const n = new Date(d); n.setDate(n.getDate() + 7); return n; },
    Monthly:   d => { const n = new Date(d); n.setMonth(n.getMonth() + 1); return n; },
    Quarterly: d => { const n = new Date(d); n.setMonth(n.getMonth() + 3); return n; },
    Yearly:    d => { const n = new Date(d); n.setFullYear(n.getFullYear() + 1); return n; },
};

const MAX_OCCURRENCES: Record<string, number> = {
    Daily: 366, Weekly: 104, Monthly: 60, Quarterly: 20, Yearly: 10,
};

function generateOccurrences(record: MaintenanceRecord): ScheduleOccurrence[] {
    const advance = record.frequency ? ADVANCE_PER_FREQUENCY[record.frequency] : undefined;
    const hasRange = !!record.startDate && !!record.endDate;

    if (!advance || !hasRange) {
        return [{
            ...record,
            parentId: record.id,
            occurrenceDate: record.startDate ?? "",
            occurrenceIndex: 0,
            totalOccurrences: 1,
        }];
    }

    const end = new Date(record.endDate!);
    end.setHours(23, 59, 59, 999);

    const list: ScheduleOccurrence[] = [];
    let current = new Date(record.startDate!);
    const max = MAX_OCCURRENCES[record.frequency!] ?? 100;

    while (current <= end && list.length < max) {
        const dateStr = current.toISOString().split("T")[0];
        list.push({
            ...record,
            id: `${record.id}_occ_${list.length}`,
            parentId: record.id,
            startDate: dateStr,
            occurrenceDate: dateStr,
            occurrenceIndex: list.length,
            totalOccurrences: 0, // back-filled below
        });
        current = advance(current);
    }

    const total = list.length;
    list.forEach(o => { o.totalOccurrences = total; });

    return list.length > 0 ? list : [{
        ...record,
        parentId: record.id,
        occurrenceDate: record.startDate ?? "",
        occurrenceIndex: 0,
        totalOccurrences: 1,
    }];
}

// ─────────────────────────────────────────────────────────────────────────────

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

    const getAssetDisplay = (assetId: string) => {
        const asset = assets.find(a => a.id === assetId);
        if (asset) return { name: asset.desc || assetId, code: asset.assetCode || asset.tagNumber || "" };
        const alloc = allocatedAssets.find(a => a.assetId === assetId);
        if (alloc) return { name: alloc.assetName || assetId, code: alloc.assetCode || alloc.tagNumber || "" };
        return { name: assetId, code: "" };
    };

    /** Original parent records — used for summary counts and modal lookups. */
    const parentScheduledRecords = useMemo(() =>
        records.filter(r => !r.isArchived && ((r.frequency && r.frequency !== "One-time") || r.status === "Scheduled")),
        [records],
    );

    /** All occurrences expanded from parent records — drives the table. */
    const scheduledOccurrences = useMemo(() =>
        parentScheduledRecords.flatMap(r => generateOccurrences(r)),
        [parentScheduledRecords],
    );

    const filtered = useMemo(() => {
        return scheduledOccurrences.filter(occ => {
            if (frequencyFilter !== "all" && occ.frequency !== frequencyFilter) return false;
            if (statusFilter !== "all" && occ.status !== statusFilter) return false;
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const assetInfo = getAssetDisplay(occ.assetId);
                return (
                    occ.description.toLowerCase().includes(q) ||
                    occ.assetId.toLowerCase().includes(q) ||
                    assetInfo.name.toLowerCase().includes(q) ||
                    assetInfo.code.toLowerCase().includes(q) ||
                    (occ.assetName || "").toLowerCase().includes(q) ||
                    (occ.assetCode || "").toLowerCase().includes(q) ||
                    occ.occurrenceDate.includes(q)
                );
            }
            return true;
        });
    }, [scheduledOccurrences, searchQuery, frequencyFilter, statusFilter, assets, allocatedAssets]);

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

    // Counts are based on unique parent records (not inflated by occurrences)
    const scheduledCount  = parentScheduledRecords.filter(r => ["Scheduled", "Pending", "Open"].includes(r.status)).length;
    const inProgressCount = parentScheduledRecords.filter(r => ["In Progress", "Inspection", "Quoted"].includes(r.status)).length;
    const completedCount  = parentScheduledRecords.filter(r => r.status === "Completed").length;

    const priorityVariant: Record<string, "danger" | "warning" | "info" | "muted"> = {
        High: "danger", Medium: "warning", Low: "info",
    };
    const statusVariant: Record<string, "info" | "success" | "warning" | "muted"> = {
        Open: "info", Inspection: "warning", Quoted: "muted",
        Scheduled: "info", Pending: "warning", "In Progress": "warning", Completed: "success",
    };

    /** Retrieve the original MaintenanceRecord for modal state (never pass a virtual occurrence). */
    const getParentRecord = (occ: ScheduleOccurrence): MaintenanceRecord =>
        records.find(r => r.id === occ.parentId) ?? (occ as unknown as MaintenanceRecord);

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

            {/* Upcoming in 30 Days — uses expanded occurrences */}
            {(() => {
                const now = new Date();
                const thirtyDaysLater = new Date(now);
                thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);

                const upcoming = scheduledOccurrences
                    .filter(occ => occ.status !== "Completed" && occ.occurrenceDate)
                    .filter(occ => {
                        const d = new Date(occ.occurrenceDate);
                        return d >= now && d <= thirtyDaysLater;
                    })
                    .sort((a, b) => new Date(a.occurrenceDate).getTime() - new Date(b.occurrenceDate).getTime())
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
                                    {upcoming.map(occ => {
                                        const occDate = new Date(occ.occurrenceDate);
                                        const daysUntil = Math.ceil((occDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                                        const assetInfo = getAssetDisplay(occ.assetId);
                                        return (
                                            <div
                                                key={occ.id}
                                                className="flex items-center gap-3 p-2.5 bg-muted/30 rounded-lg border border-border/50 cursor-pointer hover:bg-muted/60 transition-colors"
                                                onClick={() => { setSelectedRecord(getParentRecord(occ)); setIsDetailsModalOpen(true); }}
                                            >
                                                <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                                                    daysUntil <= 3 ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                                                    daysUntil <= 7 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                                                    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                                }`}>
                                                    {daysUntil === 0 ? "!" : `${daysUntil}d`}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium truncate">{occ.description}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {assetInfo.code && <span className="font-mono">{assetInfo.code} · </span>}
                                                        {occDate.toLocaleDateString()} · {occ.frequency}
                                                        {occ.totalOccurrences > 1 && (
                                                            <span className="ml-1 text-primary/70 font-medium">
                                                                #{occ.occurrenceIndex + 1}/{occ.totalOccurrences}
                                                            </span>
                                                        )}
                                                        {" · "}{occ.priority}
                                                    </p>
                                                </div>
                                                <StatusText variant={statusVariant[occ.status] ?? "muted"}>{occ.status}</StatusText>
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
                    <Input placeholder="Search by asset, description, date..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
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
                        {filtered.length !== parentScheduledRecords.length && (
                            <span className="text-xs text-muted-foreground">
                                ({parentScheduledRecords.length} schedule{parentScheduledRecords.length !== 1 ? "s" : ""})
                            </span>
                        )}
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
                                    <TableHead>Date</TableHead>
                                    <TableHead>End Date</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filtered.map(occ => {
                                    const assetInfo = getAssetDisplay(occ.assetId);
                                    const isRecurring = occ.totalOccurrences > 1;
                                    return (
                                        <TableRow
                                            key={occ.id}
                                            className="cursor-pointer hover:bg-muted/50"
                                            onClick={() => { setSelectedRecord(getParentRecord(occ)); setIsDetailsModalOpen(true); }}
                                        >
                                            {/* Asset */}
                                            <TableCell>
                                                <div className="space-y-0.5">
                                                    <span className="text-sm font-medium block truncate max-w-[180px]">
                                                        {occ.assetName || assetInfo.name}
                                                    </span>
                                                    {(occ.assetCode || assetInfo.code) && (
                                                        <span className="text-xs text-muted-foreground font-mono block">
                                                            {occ.assetCode || assetInfo.code}
                                                        </span>
                                                    )}
                                                </div>
                                            </TableCell>

                                            {/* Description */}
                                            <TableCell className="font-medium max-w-[200px] truncate">{occ.description}</TableCell>

                                            {/* Frequency + occurrence badge */}
                                            <TableCell>
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-1.5">
                                                        <RefreshCw className="h-3 w-3 text-muted-foreground" />
                                                        <span className="text-sm">{occ.frequency ?? "One-time"}</span>
                                                    </div>
                                                    {isRecurring && (
                                                        <span className="text-xs font-mono text-primary/80 font-semibold">
                                                            #{occ.occurrenceIndex + 1} of {occ.totalOccurrences}
                                                        </span>
                                                    )}
                                                </div>
                                            </TableCell>

                                            {/* Priority */}
                                            <TableCell>
                                                <StatusText variant={priorityVariant[occ.priority] ?? "muted"}>{occ.priority}</StatusText>
                                            </TableCell>

                                            {/* Status */}
                                            <TableCell>
                                                <StatusText variant={statusVariant[occ.status] ?? "muted"}>{occ.status}</StatusText>
                                            </TableCell>

                                            {/* Occurrence date */}
                                            <TableCell className="text-sm tabular-nums">
                                                {occ.occurrenceDate
                                                    ? new Date(occ.occurrenceDate).toLocaleDateString()
                                                    : "—"}
                                            </TableCell>

                                            {/* End date (from parent record) */}
                                            <TableCell className="text-sm text-muted-foreground tabular-nums">
                                                {occ.endDate ? new Date(occ.endDate).toLocaleDateString() : "—"}
                                            </TableCell>

                                            {/* Action */}
                                            <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                                                {(() => {
                                                    const nextStatus = NEXT_STATUS[occ.status];
                                                    if (!nextStatus) return <StatusText variant="success">Done</StatusText>;

                                                    const needsInspection = nextStatus === "Inspection";
                                                    const needsQuotation  = nextStatus === "Quoted";

                                                    return (
                                                        <Button
                                                            size="sm"
                                                            variant={nextStatus === "Completed" ? "default" : "outline"}
                                                            onClick={() => {
                                                                const orig = getParentRecord(occ);
                                                                if (needsInspection) {
                                                                    setInspectionTarget(orig);
                                                                } else if (needsQuotation) {
                                                                    setSelectedRecord(orig);
                                                                    setIsDetailsModalOpen(true);
                                                                } else {
                                                                    setAdvanceTarget({ id: occ.parentId, nextStatus });
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
