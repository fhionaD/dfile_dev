"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { StatusText } from "@/components/ui/status-text";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, CalendarClock, Search, Clock, CheckCircle2, Calendar, Wrench, AlertCircle, RefreshCw, Trash2, Settings } from "lucide-react";
import { useAllocatedAssetsForMaintenance, useMaintenanceRecords, useUpdateMaintenanceStatus, useUpdateMaintenanceRecord, useArchiveMaintenanceRecord } from "@/hooks/use-maintenance";
import { useAssets, useArchiveAsset } from "@/hooks/use-assets";
import { useDeallocateAsset } from "@/hooks/use-allocations";
import { useMaintenanceSettings, MaintenanceSettings } from "@/hooks/use-maintenance-settings";
import { CreateMaintenanceModal } from "@/components/modals/create-maintenance-modal";
import { MaintenanceDetailsModal } from "@/components/modals/maintenance-details-modal";
import { InspectionDiagnosisModal } from "@/components/modals/inspection-diagnosis-modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { getErrorMessage } from "@/lib/api";
import { MaintenanceRecord } from "@/types/asset";
import { toast } from "sonner";

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
    const searchParams = useSearchParams();
    const highlightId = searchParams.get('highlight');
    
    const [highlightedRowId, setHighlightedRowId] = useState<string | null>(highlightId);
    
    // Auto-clear highlight after animation completes
    useEffect(() => {
        if (highlightedRowId) {
            const timer = setTimeout(() => setHighlightedRowId(null), 2000);
            return () => clearTimeout(timer);
        }
    }, [highlightedRowId]);
    
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
    const [completedRecordIds, setCompletedRecordIds] = useState<Set<string>>(new Set());
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
    const [archiveTarget, setArchiveTarget] = useState<{ assetId: string; assetName: string } | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<{ assetId: string; assetName: string } | null>(null);
    const [assetTabView, setAssetTabView] = useState<'allocated' | 'archived'>('allocated');
    const [scheduleTabView, setScheduleTabView] = useState<'active' | 'archived'>('active');
    const [archiveScheduleTarget, setArchiveScheduleTarget] = useState<{ id: string; description: string } | null>(null);
    const [showSettings, setShowSettings] = useState(false);
    
    // Use hybrid settings management (localStorage + backend)
    const { settings, updateSetting, isSaving } = useMaintenanceSettings();
    
    // Destructure settings for convenience
    const enableAnimations = settings.enableAnimations;
    const enableAutoCost = settings.enableAutoCost;
    const enableGlint = settings.enableGlint;
    const enableGlassmorphism = settings.enableGlassmorphism;
    const enableMinimalUI = settings.enableMinimalUI;
    const enableDataCaching = settings.enableDataCaching;
    const enableBatchOperations = settings.enableBatchOperations;
    // Settings persistence is now handled by useMaintenanceSettings hook (offline-first + backend sync)

    const handleSettingChange = (settingName: string, key: string) => {
        const typedKey = key as keyof MaintenanceSettings;
        const newValue = !settings[typedKey];
        updateSetting(typedKey, newValue as boolean);
        toast.success('Setting saved successfully', {
            description: `${settingName} has been ${newValue ? 'enabled' : 'disabled'}`,
            duration: 2000,
        });
    };

    const handleGlassmorphismChange = () => {
        const newValue = !settings.enableGlassmorphism;
        updateSetting('enableGlassmorphism', newValue);
        
        if (newValue) {
            toast.warning('Performance Notice', {
                description: 'Glassmorphism effect increases CPU/GPU usage. Disable if experiencing performance issues.',
                duration: 4000,
            });
        } else {
            toast.success('Setting saved successfully', {
                description: 'Glassmorphism Effect has been disabled',
                duration: 2000,
            });
        }
    };
    const updateStatusMutation = useUpdateMaintenanceStatus();
    const updateRecordMutation = useUpdateMaintenanceRecord();
    const deallocateAssetMutation = useDeallocateAsset();
    const { data: archivedAssets = [], isLoading: archivedLoading, isError: archivedError, error: archivedErr, refetch: refetchArchived } = useAssets(true);
    const { data: archivedSchedules = [], isLoading: archivedSchedulesLoading } = useMaintenanceRecords(true);
    const deleteAssetMutation = useArchiveAsset();
    const archiveAssetMutation = useArchiveAsset();
    const archiveScheduleMutation = useArchiveMaintenanceRecord();

    const getAssetDisplay = (assetId: string) => {
        const asset = assets.find(a => a.id === assetId);
        if (asset) return { name: asset.desc || assetId, code: asset.assetCode || asset.tagNumber || "" };
        const alloc = allocatedAssets.find(a => a.assetId === assetId);
        if (alloc) return { name: alloc.assetName || assetId, code: alloc.assetCode || alloc.tagNumber || "" };
        return { name: assetId, code: "" };
    };

    /** Original parent records — used for summary counts and modal lookups. */
    const parentScheduledRecords = useMemo(() =>
        records.filter(r => !r.isArchived),
        [records],
    );

    /** Archived parent records */
    const archivedScheduledRecords = useMemo(() =>
        archivedSchedules.filter(r => r.isArchived),
        [archivedSchedules],
    );

    /** Display parent records directly without occurrence expansion */
    const scheduledRecords = useMemo(() => 
        scheduleTabView === 'active' ? parentScheduledRecords : archivedScheduledRecords, 
        [parentScheduledRecords, archivedScheduledRecords, scheduleTabView]
    );

    /** All occurrences expanded from parent records — used only for upcoming section */
    const scheduledOccurrences = useMemo(() =>
        parentScheduledRecords.flatMap(r => generateOccurrences(r)),
        [parentScheduledRecords],
    );

    const filtered = useMemo(() => {
        return scheduledRecords.filter(record => {
            if (frequencyFilter !== "all" && record.frequency !== frequencyFilter) return false;
            if (statusFilter !== "all" && record.status !== statusFilter) return false;
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
                    (record.startDate || "").includes(q)
                );
            }
            return true;
        });
    }, [scheduledRecords, searchQuery, frequencyFilter, statusFilter, getAssetDisplay]);

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

    /** Retrieve the original MaintenanceRecord (no longer needed since we're using parent records directly). */
    const getParentRecord = (record: MaintenanceRecord): MaintenanceRecord => record;

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
                <div className="flex gap-2">
                    <div className="relative group">
                        <Button variant="outline" size="icon" onClick={() => setShowSettings(!showSettings)}>
                            <Settings className="h-4 w-4" />
                        </Button>
                        {/* "On Testing" Ribbon */}
                        <div className="absolute -top-1 -right-1 bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full transform rotate-12 shadow-lg pointer-events-none">
                            On Testing
                        </div>
                        {/* Hover Tooltip */}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none group-hover:pointer-events-auto z-50">
                            <div className="relative bg-slate-900 text-white text-xs px-4 py-3 rounded-lg shadow-xl w-72 whitespace-normal">
                                <p className="font-semibold mb-1">⚠️ Testing Mode</p>
                                <p className="text-white/90">Some features are not working and only based on the working device. If you turn on glassmorphism make sure you have a dedicated GPU.</p>
                                {/* Tooltip arrow */}
                                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent border-b-slate-900"></div>
                            </div>
                        </div>
                    </div>
                    <Button onClick={() => { setSelectedRecord(null); setSelectedAssetIdForSchedule(null); setIsScheduleModalOpen(true); }} className="gap-2">
                        <Plus className="h-4 w-4" />
                        Create Ticket
                    </Button>
                </div>
            </div>

            {/* Settings Panel */}
            {showSettings && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                    <Card className={`p-6 space-y-4 shadow-2xl border border-white/20 bg-white/5 dark:bg-black/20 backdrop-blur-xl ring-1 ring-white/10`}>
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold">Display Settings</h3>
                            <Button variant="ghost" size="sm" onClick={() => setShowSettings(false)}>Close</Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                            <div className={`flex flex-col justify-between p-4 rounded-lg border transition-all shadow-lg border-white/20 bg-white/10 dark:bg-white/5 backdrop-blur-md hover:bg-white/20 dark:hover:bg-white/10`}>
                                <div className="mb-3">
                                    <p className="text-sm font-medium mb-1">Tab Animations</p>
                                    <p className="text-xs text-muted-foreground">Enable smooth transitions between tabs</p>
                                </div>
                                <button
                                    onClick={() => handleSettingChange('Tab Animations', 'enableAnimations')}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                        enableAnimations ? 'bg-primary' : 'bg-muted-foreground/30'
                                    }`}
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                                            enableAnimations ? 'translate-x-6' : 'translate-x-1'
                                        }`}
                                    />
                                </button>
                            </div>
                            <div className={`flex flex-col justify-between p-4 rounded-lg border transition-all shadow-lg border-white/20 bg-white/10 dark:bg-white/5 backdrop-blur-md hover:bg-white/20 dark:hover:bg-white/10`}>
                                <div className="mb-3">
                                    <p className="text-sm font-medium mb-1">Auto Cost Estimation</p>
                                    <p className="text-xs text-muted-foreground">Automatically estimate costs based on category</p>
                                </div>
                                <button
                                    onClick={() => handleSettingChange('Auto Cost Estimation', 'enableAutoCost')}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                        enableAutoCost ? 'bg-primary' : 'bg-muted-foreground/30'
                                    }`}
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                                            enableAutoCost ? 'translate-x-6' : 'translate-x-1'
                                        }`}
                                    />
                                </button>
                            </div>
                            <div className={`flex flex-col justify-between p-4 rounded-lg border transition-all shadow-lg border-white/20 bg-white/10 dark:bg-white/5 backdrop-blur-md hover:bg-white/20 dark:hover:bg-white/10`}>
                                <div className="mb-3">
                                    <p className="text-sm font-medium mb-1">Completion Glint Effect</p>
                                    <p className="text-xs text-muted-foreground">Show shimmer animation when tasks complete</p>
                                </div>
                                <button
                                    onClick={() => handleSettingChange('Completion Glint Effect', 'enableGlint')}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                        enableGlint ? 'bg-primary' : 'bg-muted-foreground/30'
                                    }`}
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                                            enableGlint ? 'translate-x-6' : 'translate-x-1'
                                        }`}
                                    />
                                </button>
                            </div>
                            <div className={`flex flex-col justify-between p-4 rounded-lg border transition-all shadow-lg border-white/20 bg-white/10 dark:bg-white/5 backdrop-blur-md hover:bg-white/20 dark:hover:bg-white/10`}>
                                <div className="mb-3">
                                    <p className="text-sm font-medium mb-1">Glassmorphism Effect</p>
                                    <p className="text-xs text-muted-foreground">Apply frosted glass style to modals • ⚠️ Increases usage</p>
                                </div>
                                <button
                                    onClick={handleGlassmorphismChange}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                        enableGlassmorphism ? 'bg-primary' : 'bg-muted-foreground/30'
                                    }`}
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                                            enableGlassmorphism ? 'translate-x-6' : 'translate-x-1'
                                        }`}
                                    />
                                </button>
                            </div>
                        </div>
                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Optimization Settings</div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            <div className={`flex flex-col justify-between p-4 rounded-lg border transition-all shadow-lg border-white/20 bg-white/10 dark:bg-white/5 backdrop-blur-md hover:bg-white/20 dark:hover:bg-white/10`}>
                                <div className="mb-3">
                                    <p className="text-sm font-medium mb-1">Minimal UI</p>
                                    <p className="text-xs text-muted-foreground">Hide decorative elements for faster loading</p>
                                </div>
                                <button
                                    onClick={() => handleSettingChange('Minimal UI', 'enableMinimalUI')}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                        enableMinimalUI ? 'bg-primary' : 'bg-muted-foreground/30'
                                    }`}
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                                            enableMinimalUI ? 'translate-x-6' : 'translate-x-1'
                                        }`}
                                    />
                                </button>
                            </div>
                            <div className={`flex flex-col justify-between p-4 rounded-lg border transition-all shadow-lg border-white/20 bg-white/10 dark:bg-white/5 backdrop-blur-md hover:bg-white/20 dark:hover:bg-white/10`}>
                                <div className="mb-3">
                                    <p className="text-sm font-medium mb-1">Data Caching</p>
                                    <p className="text-xs text-muted-foreground">Cache records locally for offline access</p>
                                </div>
                                <button
                                    onClick={() => handleSettingChange('Data Caching', 'enableDataCaching')}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                        enableDataCaching ? 'bg-primary' : 'bg-muted-foreground/30'
                                    }`}
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                                            enableDataCaching ? 'translate-x-6' : 'translate-x-1'
                                        }`}
                                    />
                                </button>
                            </div>
                            <div className={`flex flex-col justify-between p-4 rounded-lg border transition-all shadow-lg border-white/20 bg-white/10 dark:bg-white/5 backdrop-blur-md hover:bg-white/20 dark:hover:bg-white/10`}>
                                <div className="mb-3">
                                    <p className="text-sm font-medium mb-1">Batch Operations</p>
                                    <p className="text-xs text-muted-foreground">Group updates for improved performance</p>
                                </div>
                                <button
                                    onClick={() => handleSettingChange('Batch Operations', 'enableBatchOperations')}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                        enableBatchOperations ? 'bg-primary' : 'bg-muted-foreground/30'
                                    }`}
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                                            enableBatchOperations ? 'translate-x-6' : 'translate-x-1'
                                        }`}
                                    />
                                </button>
                            </div>
                        </div>
                    </Card>
                </div>
            )}

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

            {/* Filters and Tab Switcher */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full">
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
                <div className="flex gap-2 bg-muted p-1 rounded-lg">
                    <button
                        onClick={() => setScheduleTabView('active')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-300 ${
                            scheduleTabView === 'active'
                                ? 'bg-background text-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        Active
                        <Badge variant="secondary" className="ml-2 font-mono text-xs">{parentScheduledRecords.length}</Badge>
                    </button>
                    <button
                        onClick={() => setScheduleTabView('archived')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-300 ${
                            scheduleTabView === 'archived'
                                ? 'bg-background text-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        Archived
                        <Badge variant="secondary" className="ml-2 font-mono text-xs">{archivedScheduledRecords.length}</Badge>
                    </button>
                </div>
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
                    <div className="rounded-md border overflow-auto bg-background/50 backdrop-blur-sm">
                        <Table>
                            <TableHeader className="bg-muted/60 border-b-2 border-muted">
                                <TableRow className="hover:bg-muted/80 transition-colors">
                                    <TableHead className="font-bold text-foreground">Asset</TableHead>
                                    <TableHead className="font-bold text-foreground">Description</TableHead>
                                    <TableHead className="font-bold text-foreground">Frequency</TableHead>
                                    <TableHead className="font-bold text-foreground">Priority</TableHead>
                                    <TableHead className="font-bold text-foreground">Status</TableHead>
                                    <TableHead className="font-bold text-foreground">Date</TableHead>
                                    <TableHead className="font-bold text-foreground">End Date</TableHead>
                                    <TableHead className="text-right font-bold text-foreground">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filtered.map(record => {
                                    const assetInfo = getAssetDisplay(record.assetId);
                                    const isNewlyCompleted = enableGlint && completedRecordIds.has(record.id);
                                    const isHighlighted = highlightedRowId === record.id;
                                    return (
                                        <TableRow
                                            key={record.id}
                                            className={`cursor-pointer hover:bg-muted/70 transition-all duration-300 border-b border-muted/50 ${
                                                isNewlyCompleted || isHighlighted ? 'relative overflow-hidden' : ''
                                            }`}
                                            onClick={() => { setSelectedRecord(record); setIsDetailsModalOpen(true); }}
                                        >
                                            {(isNewlyCompleted || isHighlighted) && (
                                                <>
                                                    <td colSpan={8} className="absolute inset-0 pointer-events-none">
                                                        <div 
                                                            className={`absolute inset-0 ${isHighlighted ? 'bg-gradient-to-r from-transparent via-blue-200/40 to-transparent' : 'bg-gradient-to-r from-transparent via-emerald-200/40 to-transparent'}`}
                                                            style={{
                                                                animation: `${isHighlighted ? 'shimmer-highlight' : 'shimmer-completed'} ${isHighlighted ? '1.2s' : '5s'} ease-in-out`,
                                                                animationFillMode: 'forwards'
                                                            }}
                                                        />
                                                    </td>
                                                    <style jsx>{`
                                                        @keyframes shimmer-completed {
                                                            0% { transform: translateX(-100%); opacity: 0; }
                                                            10% { opacity: 1; }
                                                            50% { transform: translateX(100%); opacity: 1; }
                                                            90% { opacity: 1; }
                                                            100% { transform: translateX(200%); opacity: 0; }
                                                        }
                                                        @keyframes shimmer-highlight {
                                                            0% { transform: translateX(-100%); opacity: 0; background-color: rgba(59, 130, 246, 0.3); }
                                                            15% { opacity: 1; }
                                                            50% { transform: translateX(100%); opacity: 1; background-color: rgba(59, 130, 246, 0.1); }
                                                            85% { opacity: 1; background-color: rgba(59, 130, 246, 0.05); }
                                                            100% { transform: translateX(200%); opacity: 0; background-color: transparent; }
                                                        }
                                                    `}</style>
                                                </>
                                            )}
                                            {/* Asset */}
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

                                            {/* Description */}
                                            <TableCell className="font-semibold text-foreground max-w-[200px] truncate py-3 px-4">{record.description}</TableCell>

                                            {/* Frequency */}
                                            <TableCell className="py-3 px-4">
                                                <div className="flex items-center gap-1.5 text-foreground font-medium">
                                                    <RefreshCw className="h-3 w-3 text-muted-foreground" />
                                                    <span className="text-sm">{record.frequency ?? "One-time"}</span>
                                                </div>
                                            </TableCell>

                                            {/* Priority */}
                                            <TableCell className="py-3 px-4">
                                                <StatusText variant={priorityVariant[record.priority] ?? "muted"}>{record.priority}</StatusText>
                                            </TableCell>

                                            {/* Status */}
                                            <TableCell className="py-3 px-4">
                                                <StatusText variant={statusVariant[record.status] ?? "muted"}>{record.status}</StatusText>
                                            </TableCell>

                                            {/* Start date */}
                                            <TableCell className="text-sm tabular-nums font-medium text-foreground py-3 px-4">
                                                {record.startDate
                                                    ? new Date(record.startDate).toLocaleDateString()
                                                    : "—"}
                                            </TableCell>

                                            {/* End date */}
                                            <TableCell className="text-sm font-medium text-foreground tabular-nums py-3 px-4">
                                                {record.endDate ? new Date(record.endDate).toLocaleDateString() : "—"}
                                            </TableCell>

                                            {/* Action */}
                                            <TableCell className="text-right py-3 px-4" onClick={e => e.stopPropagation()}>
                                                {(() => {
                                                    // Show Archive button for completed schedules in active tab
                                                    if (scheduleTabView === 'active' && record.status === "Completed") {
                                                        return (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => {
                                                                    setArchiveScheduleTarget({ id: record.id, description: record.description });
                                                                }}
                                                            >
                                                                Archive
                                                            </Button>
                                                        );
                                                    }

                                                    // Show status for archived schedules
                                                    if (scheduleTabView === 'archived') {
                                                        return <StatusText variant="muted">Archived</StatusText>;
                                                    }

                                                    const nextStatus = NEXT_STATUS[record.status];
                                                    if (!nextStatus) return <StatusText variant="success">Done</StatusText>;

                                                    const needsInspection = nextStatus === "Inspection";
                                                    const needsQuotation  = nextStatus === "Quoted";

                                                    return (
                                                        <Button
                                                            size="sm"
                                                            variant={nextStatus === "Completed" ? "default" : "outline"}
                                                            onClick={() => {
                                                                if (needsInspection) {
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

            {/* Assets Management - Tabbed Interface */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold">Assets Management</h2>
                    <div className="flex gap-2 bg-muted p-1 rounded-lg">
                        <button
                            onClick={() => setAssetTabView('allocated')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-300 ${
                                assetTabView === 'allocated'
                                    ? 'bg-background text-foreground shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            Allocated Assets
                            <Badge variant="secondary" className="ml-2 font-mono text-xs">{filteredAllocatedAssets.length}</Badge>
                        </button>
                        <button
                            onClick={() => setAssetTabView('archived')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-300 ${
                                assetTabView === 'archived'
                                    ? 'bg-background text-foreground shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            Archived Assets
                            <Badge variant="secondary" className="ml-2 font-mono text-xs">{archivedAssets.length}</Badge>
                        </button>
                    </div>
                </div>

                {/* Allocated Assets Tab */}
                <div className={`${enableAnimations ? 'transition-all duration-300 ease-in-out' : ''} ${
                    assetTabView === 'allocated'
                        ? 'opacity-100 visible'
                        : 'opacity-0 invisible absolute'
                }`}>
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-xs text-muted-foreground">Click &quot;Archive&quot; to remove from allocated assets</p>
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
                                                    variant="destructive"
                                                    onClick={() => {
                                                        setArchiveTarget({ assetId: a.assetId, assetName: a.assetName || a.assetId });
                                                    }}
                                                >
                                                    Archive
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </div>

                {/* Archived Assets Tab */}
                <div className={`${enableAnimations ? 'transition-all duration-300 ease-in-out' : ''} ${
                    assetTabView === 'archived'
                        ? 'opacity-100 visible'
                        : 'opacity-0 invisible absolute'
                }`}>
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-xs text-muted-foreground">Click &quot;Delete&quot; to permanently remove archived assets</p>
                    </div>

                    {archivedLoading ? (
                        <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
                    ) : archivedError ? (
                        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-6 text-center space-y-3">
                            <AlertCircle className="h-10 w-10 mx-auto text-destructive opacity-80" />
                            <p className="font-medium text-destructive">Could not load archived assets</p>
                            <p className="text-sm text-muted-foreground max-w-md mx-auto">{getErrorMessage(archivedErr, "Check that the API is running.")}</p>
                            <Button variant="outline" size="sm" onClick={() => refetchArchived()}>Retry</Button>
                        </div>
                    ) : archivedAssets.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground rounded-md border">
                            <Wrench className="h-12 w-12 mx-auto mb-4 opacity-20" />
                            <p>No archived assets found</p>
                        </div>
                    ) : (
                        <div className="rounded-md border overflow-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Asset</TableHead>
                                        <TableHead>Category</TableHead>
                                        <TableHead>Asset Code</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {archivedAssets.map(a => (
                                        <TableRow key={a.id}>
                                            <TableCell className="font-medium">
                                                <div className="flex flex-col">
                                                    <span>{a.desc || a.id}</span>
                                                    <span className="text-xs text-muted-foreground font-mono">{a.tagNumber || a.id}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>{a.categoryName || "—"}</TableCell>
                                            <TableCell className="font-mono text-sm">{a.assetCode || "—"}</TableCell>
                                            <TableCell>
                                                <StatusText variant="muted">Archived</StatusText>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    onClick={() => {
                                                        setDeleteTarget({ assetId: a.id, assetName: a.desc || a.id });
                                                    }}
                                                >
                                                    <Trash2 className="h-4 w-4 mr-1.5" />
                                                    Delete
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </div>
            </div>

            <CreateMaintenanceModal
                key={selectedAssetIdForSchedule ?? "schedule-maintenance-modal"}
                open={isScheduleModalOpen}
                onOpenChange={(open) => {
                    setIsScheduleModalOpen(open);
                    if (!open) setSelectedAssetIdForSchedule(null);
                }}
                defaultAssetId={selectedAssetIdForSchedule}
                enableAutoCost={enableAutoCost}
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
                onOpenChange={(open) => { if (!open) setInspectionTarget(null); }}
                assetName={inspectionTarget?.assetName || inspectionTarget?.assetId}
                isLoading={updateRecordMutation.isPending}
                enableGlassmorphism={enableGlassmorphism}
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
                        
                        // If status is Completed, add to glint animation set
                        if (advanceTarget.nextStatus === "Completed") {
                            setCompletedRecordIds(prev => new Set(prev).add(advanceTarget.id));
                            // Remove from set after 5 seconds
                            setTimeout(() => {
                                setCompletedRecordIds(prev => {
                                    const newSet = new Set(prev);
                                    newSet.delete(advanceTarget.id);
                                    return newSet;
                                });
                            }, 5000);
                        }
                        
                        setAdvanceTarget(null);
                    }
                }}
                isLoading={updateStatusMutation.isPending}
            />

            <ConfirmDialog
                open={archiveTarget !== null}
                onOpenChange={(open) => { if (!open) setArchiveTarget(null); }}
                title="Archive Asset"
                description={`Are you sure you want to archive "${archiveTarget?.assetName}"? This will remove it from allocated assets and move it to archived.`}
                confirmLabel="Archive"
                onConfirm={async () => {
                    if (archiveTarget) {
                        await archiveAssetMutation.mutateAsync(archiveTarget.assetId);
                        setArchiveTarget(null);
                    }
                }}
                isLoading={archiveAssetMutation.isPending}
            />

            <ConfirmDialog
                open={deleteTarget !== null}
                onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
                title="Delete Archived Asset"
                description={`Are you sure you want to permanently delete "${deleteTarget?.assetName}"? This action cannot be undone.`}
                confirmLabel="Delete"
                onConfirm={async () => {
                    if (deleteTarget) {
                        await deleteAssetMutation.mutateAsync(deleteTarget.assetId);
                        setDeleteTarget(null);
                    }
                }}
                isLoading={deleteAssetMutation.isPending}
            />

            <ConfirmDialog
                open={archiveScheduleTarget !== null}
                onOpenChange={(open) => { if (!open) setArchiveScheduleTarget(null); }}
                title="Archive Maintenance Schedule"
                description={`Are you sure you want to archive "${archiveScheduleTarget?.description}"? This will move it to the archived schedules tab.`}
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
