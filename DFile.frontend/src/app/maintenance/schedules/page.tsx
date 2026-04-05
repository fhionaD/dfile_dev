"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { StatusText } from "@/components/ui/status-text";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, CalendarClock, Search, Clock, CheckCircle2, Calendar, RefreshCw } from "lucide-react";
import { useAllocatedAssetsForMaintenance, useMaintenanceRecords, useUpdateMaintenanceStatus, useArchiveMaintenanceRecord, useSubmitInspectionWorkflow } from "@/hooks/use-maintenance";
import { useMaintenanceContext } from "@/contexts/maintenance-context";
import { CreateMaintenanceModal } from "@/components/modals/create-maintenance-modal";
import { MaintenanceDetailsModal } from "@/components/modals/maintenance-details-modal";
import { InspectionDiagnosisModal } from "@/components/modals/inspection-diagnosis-modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { MaintenanceRecord } from "@/types/asset";
import { toast } from "sonner";

type ScheduleOccurrence = MaintenanceRecord & {
    parentId: string;
    occurrenceDate: string;
    occurrenceIndex: number;
    totalOccurrences: number;
};

const ADVANCE_PER_FREQUENCY: Record<string, (d: Date) => Date> = {
    Daily: (d) => {
        const n = new Date(d);
        n.setDate(n.getDate() + 1);
        return n;
    },
    Weekly: (d) => {
        const n = new Date(d);
        n.setDate(n.getDate() + 7);
        return n;
    },
    Monthly: (d) => {
        const n = new Date(d);
        n.setMonth(n.getMonth() + 1);
        return n;
    },
    Quarterly: (d) => {
        const n = new Date(d);
        n.setMonth(n.getMonth() + 3);
        return n;
    },
    Yearly: (d) => {
        const n = new Date(d);
        n.setFullYear(n.getFullYear() + 1);
        return n;
    },
};

const MAX_OCCURRENCES: Record<string, number> = {
    Daily: 366,
    Weekly: 104,
    Monthly: 60,
    Quarterly: 20,
    Yearly: 10,
};

function generateOccurrences(record: MaintenanceRecord): ScheduleOccurrence[] {
    const advance = record.frequency ? ADVANCE_PER_FREQUENCY[record.frequency] : undefined;
    /** Server now persists one row per date with scheduleSeriesId and null endDate; expand only legacy range rows. */
    const legacyRangeExpand =
        !record.scheduleSeriesId &&
        !!record.startDate &&
        !!record.endDate &&
        !!advance &&
        record.frequency &&
        record.frequency !== "One-time";

    if (!legacyRangeExpand) {
        return [
            {
                ...record,
                parentId: record.id,
                occurrenceDate: record.startDate ?? "",
                occurrenceIndex: 0,
                totalOccurrences: 1,
            },
        ];
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
            totalOccurrences: 0,
        });
        current = advance(current);
    }

    const total = list.length;
    list.forEach((o) => {
        o.totalOccurrences = total;
    });

    return list.length > 0
        ? list
        : [
              {
                  ...record,
                  parentId: record.id,
                  occurrenceDate: record.startDate ?? "",
                  occurrenceIndex: 0,
                  totalOccurrences: 1,
              },
          ];
}

function localDateString(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

function canStartInspection(record: MaintenanceRecord): boolean {
    if (!record.startDate) return true;
    const start = record.startDate.slice(0, 10);
    const today = localDateString(new Date());
    return start <= today;
}

export default function SchedulesPage() {
    const searchParams = useSearchParams();
    const highlightId = searchParams.get("highlight");

    const { enableGlassmorphism, enableGlint } = useMaintenanceContext();

    const cardClassName = enableGlassmorphism
        ? "border border-white/20 bg-white/10 dark:bg-black/10 backdrop-blur-xl ring-1 ring-white/10"
        : "";

    const [highlightedRowId, setHighlightedRowId] = useState<string | null>(highlightId);

    useEffect(() => {
        if (highlightedRowId) {
            const timer = setTimeout(() => setHighlightedRowId(null), 2000);
            return () => clearTimeout(timer);
        }
    }, [highlightedRowId]);

    const { data: records = [], isLoading } = useMaintenanceRecords(false);
    const { data: allocatedAssets = [], isLoading: assetsLoading } = useAllocatedAssetsForMaintenance();

    const [searchQuery, setSearchQuery] = useState("");
    const [frequencyFilter, setFrequencyFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [kpiPriority, setKpiPriority] = useState<"all" | "Low" | "Medium" | "High">("all");
    const [kpiDiagnosis, setKpiDiagnosis] = useState<"all" | "Repairable" | "Not Repairable" | "No Fix Needed">("all");

    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    const [selectedAssetIdForSchedule, setSelectedAssetIdForSchedule] = useState<string | null>(null);
    const [advanceTarget, setAdvanceTarget] = useState<{ id: string; nextStatus: string } | null>(null);
    const [completedRecordIds, setCompletedRecordIds] = useState<Set<string>>(new Set());

    const NEXT_STATUS: Record<string, string> = {
        Open: "Inspection",
        Inspection: "Quoted",
        Quoted: "In Progress",
        "In Progress": "Completed",
        Scheduled: "Inspection",
        Pending: "Inspection",
    };

    const [selectedRecord, setSelectedRecord] = useState<MaintenanceRecord | null>(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [inspectionTarget, setInspectionTarget] = useState<MaintenanceRecord | null>(null);
    const [scheduleTabView, setScheduleTabView] = useState<"active" | "history" | "archived">("active");
    const [archiveScheduleTarget, setArchiveScheduleTarget] = useState<{ id: string; description: string } | null>(null);

    const updateStatusMutation = useUpdateMaintenanceStatus();
    const archiveScheduleMutation = useArchiveMaintenanceRecord();
    const submitInspectionMutation = useSubmitInspectionWorkflow();

    const { data: archivedSchedules = [], isLoading: archivedSchedulesLoading } = useMaintenanceRecords(true);

    const parentNonArchived = useMemo(() => records.filter((r) => !r.isArchived), [records]);
    const activeParents = useMemo(() => parentNonArchived.filter((r) => r.status !== "Completed"), [parentNonArchived]);
    const historyParents = useMemo(() => parentNonArchived.filter((r) => r.status === "Completed"), [parentNonArchived]);
    const archivedParents = useMemo(() => archivedSchedules.filter((r) => r.isArchived), [archivedSchedules]);

    const scheduledRecords = useMemo(() => {
        if (scheduleTabView === "active") return activeParents;
        if (scheduleTabView === "history") return historyParents;
        return archivedParents;
    }, [scheduleTabView, activeParents, historyParents, archivedParents]);

    const scheduledOccurrences = useMemo(() => activeParents.flatMap((r) => generateOccurrences(r)), [activeParents]);

    const getAssetDisplay = useCallback((assetId: string) => {
        const alloc = allocatedAssets.find((a) => a.assetId === assetId);
        if (alloc) return { name: alloc.assetName || assetId, code: alloc.assetCode || alloc.tagNumber || "" };
        return { name: assetId, code: "" };
    }, [allocatedAssets]);

    const filtered = useMemo(() => {
        return scheduledRecords.filter((record) => {
            if (frequencyFilter !== "all" && record.frequency !== frequencyFilter) return false;
            if (statusFilter !== "all" && record.status !== statusFilter) return false;
            if (kpiPriority !== "all" && record.priority !== kpiPriority) return false;
            if (kpiDiagnosis !== "all") {
                const d = record.diagnosisOutcome ?? "";
                if (d !== kpiDiagnosis) return false;
            }
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const assetInfo = getAssetDisplay(record.assetId);
                return (
                    record.description.toLowerCase().includes(q) ||
                    record.assetId.toLowerCase().includes(q) ||
                    assetInfo.name.toLowerCase().includes(q) ||
                    assetInfo.code.toLowerCase().includes(q) ||
                    (record.assetName || "").toLowerCase().includes(q) ||
                    (record.assetCode || "").toLowerCase().includes(q) ||
                    (record.requestId || "").toLowerCase().includes(q) ||
                    (record.startDate || "").includes(q)
                );
            }
            return true;
        });
    }, [scheduledRecords, searchQuery, frequencyFilter, statusFilter, kpiPriority, kpiDiagnosis, getAssetDisplay]);

    /** KPI counts match the current tab so filter buttons align with visible rows. */
    const kpiScopeRecords = useMemo(() => {
        if (scheduleTabView === "active") return activeParents;
        if (scheduleTabView === "history") return historyParents;
        return archivedParents;
    }, [scheduleTabView, activeParents, historyParents, archivedParents]);

    const priorityKpi = useMemo(() => {
        return {
            Low: kpiScopeRecords.filter((r) => r.priority === "Low").length,
            Medium: kpiScopeRecords.filter((r) => r.priority === "Medium").length,
            High: kpiScopeRecords.filter((r) => r.priority === "High").length,
        };
    }, [kpiScopeRecords]);

    const diagnosisKpi = useMemo(() => {
        return {
            Repairable: kpiScopeRecords.filter((r) => r.diagnosisOutcome === "Repairable").length,
            "Not Repairable": kpiScopeRecords.filter((r) => r.diagnosisOutcome === "Not Repairable").length,
            "No Fix Needed": kpiScopeRecords.filter((r) => r.diagnosisOutcome === "No Fix Needed").length,
        };
    }, [kpiScopeRecords]);

    const scheduledCount = activeParents.filter((r) => ["Scheduled", "Pending", "Open"].includes(r.status)).length;
    const inProgressCount = activeParents.filter((r) => ["In Progress", "Inspection", "Quoted", "Finance Review", "Waiting for Replacement"].includes(r.status)).length;
    const completedCount = historyParents.length;

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
        "Finance Review": "warning",
        "Waiting for Replacement": "warning",
    };

    const tableSkeleton = isLoading || (scheduleTabView === "archived" && archivedSchedulesLoading);

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
                <Button
                    onClick={() => {
                        setSelectedRecord(null);
                        setSelectedAssetIdForSchedule(null);
                        setIsScheduleModalOpen(true);
                    }}
                    className="gap-2"
                >
                    <Plus className="h-4 w-4" />
                    New schedule
                </Button>
            </div>

            <section className="grid gap-4 sm:grid-cols-3">
                <Card className={cardClassName}>
                    <div className="p-5 space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">Scheduled / Pending</p>
                            <Calendar className="h-4 w-4 text-blue-600" />
                        </div>
                        {isLoading ? <Skeleton className="h-8 w-16" /> : <p className="text-2xl font-bold text-blue-600">{scheduledCount}</p>}
                    </div>
                </Card>
                <Card className={cardClassName}>
                    <div className="p-5 space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">In Progress</p>
                            <Clock className="h-4 w-4 text-amber-600" />
                        </div>
                        {isLoading ? <Skeleton className="h-8 w-16" /> : <p className="text-2xl font-bold text-amber-600">{inProgressCount}</p>}
                    </div>
                </Card>
                <Card className={cardClassName}>
                    <div className="p-5 space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">Completed (history)</p>
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        </div>
                        {isLoading ? <Skeleton className="h-8 w-16" /> : <p className="text-2xl font-bold text-emerald-600">{completedCount}</p>}
                    </div>
                </Card>
            </section>

            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Card className={cardClassName}>
                    <div className="p-4 space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Priority</p>
                        <div className="flex flex-wrap gap-2">
                            {(["Low", "Medium", "High"] as const).map((p) => (
                                <button
                                    key={p}
                                    type="button"
                                    onClick={() => setKpiPriority((cur) => (cur === p ? "all" : p))}
                                    className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                                        kpiPriority === p ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted/60"
                                    }`}
                                >
                                    {p} ({priorityKpi[p]})
                                </button>
                            ))}
                        </div>
                    </div>
                </Card>
                <Card className={`sm:col-span-2 ${cardClassName}`}>
                    <div className="p-4 space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Inspection results</p>
                        <div className="flex flex-wrap gap-2">
                            {(["Repairable", "Not Repairable", "No Fix Needed"] as const).map((d) => (
                                <button
                                    key={d}
                                    type="button"
                                    onClick={() => setKpiDiagnosis((cur) => (cur === d ? "all" : d))}
                                    className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                                        kpiDiagnosis === d ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted/60"
                                    }`}
                                >
                                    {d} ({diagnosisKpi[d]})
                                </button>
                            ))}
                        </div>
                    </div>
                </Card>
            </section>

            {(() => {
                const now = new Date();
                const thirtyDaysLater = new Date(now);
                thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);

                const upcoming = scheduledOccurrences
                    .filter((occ) => occ.status !== "Completed" && occ.occurrenceDate)
                    .filter((occ) => {
                        const d = new Date(occ.occurrenceDate);
                        return d >= now && d <= thirtyDaysLater;
                    })
                    .sort((a, b) => new Date(a.occurrenceDate).getTime() - new Date(b.occurrenceDate).getTime())
                    .slice(0, 5);

                if (upcoming.length === 0 && !isLoading) return null;

                return (
                    <Card className={cardClassName}>
                        <div className="p-5 space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                                    <CalendarClock className="h-4 w-4 text-primary" /> Upcoming in 30 Days
                                </h3>
                                <span className="text-xs text-muted-foreground">{upcoming.length} task(s)</span>
                            </div>
                            {isLoading ? (
                                <div className="space-y-2">
                                    {[1, 2].map((i) => (
                                        <Skeleton key={i} className="h-10 w-full" />
                                    ))}
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {upcoming.map((occ) => {
                                        const occDate = new Date(occ.occurrenceDate);
                                        const daysUntil = Math.ceil((occDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                                        const assetInfo = getAssetDisplay(occ.assetId);
                                        const parent = records.find((r) => r.id === occ.parentId) ?? occ;
                                        return (
                                            <div
                                                key={occ.id}
                                                className="flex items-center gap-3 p-2.5 bg-muted/30 rounded-lg border border-border/50 cursor-pointer hover:bg-muted/60 transition-colors"
                                                onClick={() => {
                                                    setSelectedRecord(parent);
                                                    setIsDetailsModalOpen(true);
                                                }}
                                            >
                                                <div
                                                    className={`h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                                                        daysUntil <= 3
                                                            ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                                            : daysUntil <= 7
                                                              ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                                              : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                                    }`}
                                                >
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
                                                        {" · "}
                                                        {occ.priority}
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

            <div className="flex flex-col gap-3">
                <Tabs value={scheduleTabView} onValueChange={(v) => setScheduleTabView(v as typeof scheduleTabView)} className="w-full">
                    <TabsList className="grid h-11 w-full max-w-xl grid-cols-3">
                        <TabsTrigger value="active" className="text-sm">
                            Active ({activeParents.length})
                        </TabsTrigger>
                        <TabsTrigger value="history" className="text-sm">
                            History ({historyParents.length})
                        </TabsTrigger>
                        <TabsTrigger value="archived" className="text-sm">
                            Archived ({archivedParents.length})
                        </TabsTrigger>
                    </TabsList>
                </Tabs>

                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                    <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by asset, request ID, description, date..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <Select value={frequencyFilter} onValueChange={setFrequencyFilter}>
                            <SelectTrigger className="w-[160px]">
                                <SelectValue placeholder="Frequency" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Frequencies</SelectItem>
                                <SelectItem value="One-time">One-time</SelectItem>
                                <SelectItem value="Daily">Daily</SelectItem>
                                <SelectItem value="Weekly">Weekly</SelectItem>
                                <SelectItem value="Monthly">Monthly</SelectItem>
                                <SelectItem value="Quarterly">Quarterly</SelectItem>
                                <SelectItem value="Yearly">Yearly</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="Open">Open</SelectItem>
                                <SelectItem value="Pending">Pending</SelectItem>
                                <SelectItem value="Scheduled">Scheduled</SelectItem>
                                <SelectItem value="Inspection">Inspection</SelectItem>
                                <SelectItem value="Finance Review">Finance Review</SelectItem>
                                <SelectItem value="Waiting for Replacement">Waiting for Replacement</SelectItem>
                                <SelectItem value="In Progress">In Progress</SelectItem>
                                <SelectItem value="Completed">Completed</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            <div>
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <h2 className="text-lg font-semibold">Schedules</h2>
                        <Badge variant="secondary" className="font-mono text-xs">
                            {filtered.length}
                        </Badge>
                    </div>
                </div>

                {tableSkeleton ? (
                    <div className="space-y-3">
                        {[...Array(5)].map((_, i) => (
                            <Skeleton key={i} className="h-12 w-full" />
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground rounded-md border min-h-[280px] flex flex-col items-center justify-center">
                        <CalendarClock className="h-12 w-12 mx-auto mb-4 opacity-20" />
                        <p>No schedules in this view</p>
                    </div>
                ) : (
                    <div
                        className={`rounded-md border overflow-auto min-h-[400px] max-h-[560px] ${cardClassName} bg-background/50 backdrop-blur-sm`}
                    >
                        <Table>
                            <TableHeader className="bg-muted/60 border-b-2 border-muted sticky top-0 z-10">
                                <TableRow className="hover:bg-muted/80 transition-colors">
                                    <TableHead className="font-bold text-foreground">Request</TableHead>
                                    <TableHead className="font-bold text-foreground">Asset</TableHead>
                                    <TableHead className="font-bold text-foreground">Description</TableHead>
                                    <TableHead className="font-bold text-foreground">Frequency</TableHead>
                                    <TableHead className="font-bold text-foreground">Priority</TableHead>
                                    <TableHead className="font-bold text-foreground">Status</TableHead>
                                    <TableHead className="font-bold text-foreground">Date</TableHead>
                                    <TableHead className="text-right font-bold text-foreground">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filtered.map((record) => {
                                    const assetInfo = getAssetDisplay(record.assetId);
                                    const isNewlyCompleted = enableGlint && completedRecordIds.has(record.id);
                                    const isHighlighted = highlightedRowId === record.id;
                                    const inspectOk = canStartInspection(record);
                                    return (
                                        <TableRow
                                            key={record.id}
                                            className={`cursor-pointer hover:bg-muted/70 transition-all duration-300 border-b border-muted/50 ${
                                                isNewlyCompleted || isHighlighted ? "relative overflow-hidden" : ""
                                            }`}
                                            onClick={() => {
                                                setSelectedRecord(record);
                                                setIsDetailsModalOpen(true);
                                            }}
                                        >
                                            <TableCell className="py-3 px-4 font-mono text-xs">{record.requestId ?? "—"}</TableCell>
                                            <TableCell className="py-3 px-4">
                                                <div className="space-y-0.5">
                                                    <span className="text-sm font-semibold text-foreground block truncate max-w-[180px]">
                                                        {record.assetName || assetInfo.name}
                                                    </span>
                                                    {(record.assetCode || assetInfo.code) && (
                                                        <span className="text-xs text-muted-foreground/80 font-mono block">
                                                            {record.assetCode || assetInfo.code}
                                                        </span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-semibold text-foreground max-w-[200px] truncate py-3 px-4">
                                                {record.description}
                                            </TableCell>
                                            <TableCell className="py-3 px-4">
                                                <div className="flex items-center gap-1.5 text-foreground font-medium">
                                                    <RefreshCw className="h-3 w-3 text-muted-foreground" />
                                                    <span className="text-sm">{record.frequency ?? "One-time"}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-3 px-4">
                                                <StatusText variant={priorityVariant[record.priority] ?? "muted"}>{record.priority}</StatusText>
                                            </TableCell>
                                            <TableCell className="py-3 px-4">
                                                <StatusText variant={statusVariant[record.status] ?? "muted"}>{record.status}</StatusText>
                                            </TableCell>
                                            <TableCell className="text-sm tabular-nums font-medium text-foreground py-3 px-4">
                                                {record.startDate ? new Date(record.startDate).toLocaleDateString() : "—"}
                                            </TableCell>
                                            <TableCell className="text-right py-3 px-4" onClick={(e) => e.stopPropagation()}>
                                                {(() => {
                                                    if (scheduleTabView === "history" && record.status === "Completed") {
                                                        return (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => setArchiveScheduleTarget({ id: record.id, description: record.description })}
                                                            >
                                                                Archive
                                                            </Button>
                                                        );
                                                    }
                                                    if (scheduleTabView === "archived") {
                                                        return <StatusText variant="muted">Archived</StatusText>;
                                                    }
                                                    if (record.status === "Finance Review" || record.status === "Waiting for Replacement") {
                                                        return <StatusText variant="warning">{record.status}</StatusText>;
                                                    }

                                                    const nextStatus = NEXT_STATUS[record.status];
                                                    if (!nextStatus) return <StatusText variant="success">Done</StatusText>;

                                                    const needsInspection = nextStatus === "Inspection";
                                                    const needsQuotation = nextStatus === "Quoted";

                                                    return (
                                                        <Button
                                                            size="sm"
                                                            variant={nextStatus === "Completed" ? "default" : "outline"}
                                                            disabled={needsInspection && !inspectOk}
                                                            title={needsInspection && !inspectOk ? "Available on or after the scheduled start date" : undefined}
                                                            onClick={() => {
                                                                if (needsInspection) {
                                                                    if (!inspectOk) {
                                                                        toast.error("Inspection is not available before the scheduled date.");
                                                                        return;
                                                                    }
                                                                    setInspectionTarget(record);
                                                                } else if (needsQuotation) {
                                                                    setSelectedRecord(record);
                                                                    setIsDetailsModalOpen(true);
                                                                } else {
                                                                    setAdvanceTarget({ id: record.id, nextStatus });
                                                                }
                                                            }}
                                                            className={nextStatus === "Completed" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}
                                                        >
                                                            {needsInspection ? "Inspection" : nextStatus}
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

            {assetsLoading ? null : allocatedAssets.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                    No allocated assets were returned for scheduling. Use Allocation to assign assets, or ensure Maintenance can view allocations.
                </p>
            ) : null}

            <CreateMaintenanceModal
                key={selectedAssetIdForSchedule ?? "schedule-maintenance-modal"}
                open={isScheduleModalOpen}
                onOpenChange={(open) => {
                    setIsScheduleModalOpen(open);
                    if (!open) setSelectedAssetIdForSchedule(null);
                }}
                defaultAssetId={selectedAssetIdForSchedule}
                enableGlassmorphism={enableGlassmorphism}
            />

            <MaintenanceDetailsModal
                open={isDetailsModalOpen}
                onOpenChange={setIsDetailsModalOpen}
                record={selectedRecord}
                enableGlassmorphism={enableGlassmorphism}
                onOpenInspectionModal={(record) => setInspectionTarget(record)}
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
                onOpenChange={(open) => {
                    if (!open) setInspectionTarget(null);
                }}
                assetId={inspectionTarget?.assetId}
                maintenanceRecord={inspectionTarget}
                assetName={inspectionTarget?.assetName || inspectionTarget?.assetId}
                isLoading={submitInspectionMutation.isPending}
                enableGlassmorphism={enableGlassmorphism}
                onSubmit={async (payload) => {
                    if (!inspectionTarget) return;
                    await submitInspectionMutation.mutateAsync({ id: inspectionTarget.id, payload });
                    setInspectionTarget(null);
                }}
            />

            <ConfirmDialog
                open={advanceTarget !== null}
                onOpenChange={(open) => {
                    if (!open) setAdvanceTarget(null);
                }}
                title={`Move to ${advanceTarget?.nextStatus || ""}`}
                description={`Are you sure you want to advance this maintenance task to "${advanceTarget?.nextStatus}"?`}
                confirmLabel={`Move to ${advanceTarget?.nextStatus || ""}`}
                onConfirm={async () => {
                    if (advanceTarget) {
                        await updateStatusMutation.mutateAsync({ id: advanceTarget.id, status: advanceTarget.nextStatus });
                        if (advanceTarget.nextStatus === "Completed") {
                            setCompletedRecordIds((prev) => new Set(prev).add(advanceTarget.id));
                            setTimeout(() => {
                                setCompletedRecordIds((prev) => {
                                    const n = new Set(prev);
                                    n.delete(advanceTarget.id);
                                    return n;
                                });
                            }, 5000);
                        }
                        setAdvanceTarget(null);
                    }
                }}
                isLoading={updateStatusMutation.isPending}
            />

            <ConfirmDialog
                open={archiveScheduleTarget !== null}
                onOpenChange={(open) => {
                    if (!open) setArchiveScheduleTarget(null);
                }}
                title="Archive Maintenance Schedule"
                description={`Archive "${archiveScheduleTarget?.description}"? It will appear under the Archived tab.`}
                confirmLabel="Archive"
                onConfirm={async () => {
                    if (archiveScheduleTarget) {
                        await archiveScheduleMutation.mutateAsync(archiveScheduleTarget.id);
                        setArchiveScheduleTarget(null);
                    }
                }}
                isLoading={archiveScheduleMutation.isPending}
            />
        </div>
    );
}
