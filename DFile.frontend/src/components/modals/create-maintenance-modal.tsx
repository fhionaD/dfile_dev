"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Wrench, AlertTriangle, FileText, Calendar, Layers, ChevronDown, ChevronRight, MapPin } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { SearchableSelect, type SearchableSelectOption } from "@/components/ui/searchable-select";
import { MaintenanceRecord } from "@/types/asset";
import { useAsset } from "@/hooks/use-assets";
import { useAllocatedAssetsForMaintenance, useAddMaintenanceRecord, useUpdateMaintenanceRecord } from "@/hooks/use-maintenance";
import { Skeleton } from "@/components/ui/skeleton";

interface CreateMaintenanceModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialData?: MaintenanceRecord | null;
    defaultAssetId?: string | null;
    /** @deprecated No longer used; estimated cost is captured only in the repairable inspection flow. */
    enableAutoCost?: boolean;
    enableGlassmorphism?: boolean;
}

function roomLabel(a: { roomCode?: string | null; roomName?: string | null }): string {
    if (a.roomCode && a.roomName) return `${a.roomCode} · ${a.roomName}`;
    return a.roomCode || a.roomName || "";
}

export function CreateMaintenanceModal({
    open,
    onOpenChange,
    initialData,
    defaultAssetId,
    enableGlassmorphism = false,
}: CreateMaintenanceModalProps) {
    const { data: allocated = [], isLoading: allocLoading } = useAllocatedAssetsForMaintenance();
    const addRecordMutation = useAddMaintenanceRecord();
    const updateRecordMutation = useUpdateMaintenanceRecord();
    const [validationError, setValidationError] = useState<string | null>(null);
    const recurringSeriesIdRef = useRef<string | null>(null);

    const [formData, setFormData] = useState<Partial<MaintenanceRecord> & { roomId?: string }>({
        assetId: "",
        roomId: "",
        description: "",
        priority: "Medium",
        type: "Corrective",
        frequency: "One-time",
        status: "Open",
        startDate: "",
        endDate: "",
    });

    const [sectionScheduleOpen, setSectionScheduleOpen] = useState(true);
    const [sectionDetailsOpen, setSectionDetailsOpen] = useState(true);

    const { data: previewAsset, isLoading: previewLoading } = useAsset(formData.assetId || "", {
        enabled: open && !!formData.assetId,
    });

    const allocationOptions: SearchableSelectOption[] = useMemo(() => {
        return allocated.map((a) => ({
            value: a.assetId,
            label: `${a.assetName || a.assetId}${roomLabel(a) ? ` – ${roomLabel(a)}` : ""}`,
            keywords: `${a.assetCode ?? ""} ${a.categoryName ?? ""} ${a.roomName ?? ""} ${a.roomCode ?? ""}`,
        }));
    }, [allocated]);

    const optionsWithFallback = useMemo(() => {
        const base = [...allocationOptions];
        if (initialData?.assetId && !base.some((o) => o.value === initialData.assetId)) {
            const rl = initialData.roomCode || initialData.roomName ? roomLabel(initialData) : "";
            base.unshift({
                value: initialData.assetId,
                label: `${initialData.assetName || initialData.assetId}${rl ? ` – ${rl}` : ""}`,
                keywords: initialData.assetCode || "",
            });
        }
        return base;
    }, [allocationOptions, initialData]);

    /* Dialog open / defaults: intentional state sync (not external subscription). */
    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        if (open) {
            setValidationError(null);
            recurringSeriesIdRef.current = null;
            if (initialData) {
                setFormData({
                    assetId: initialData.assetId || "",
                    roomId: initialData.roomId || "",
                    description: initialData.description || "",
                    priority: initialData.priority || "Medium",
                    type: initialData.type || "Corrective",
                    frequency: initialData.frequency || "One-time",
                    status: initialData.status,
                    startDate: initialData.startDate || "",
                    endDate: initialData.endDate || "",
                });
            } else {
                const today = new Date().toISOString().split("T")[0];
                const defAid = defaultAssetId || "";
                setFormData({
                    assetId: defAid,
                    roomId: "",
                    description: "",
                    priority: "Medium",
                    type: "Corrective",
                    frequency: "One-time",
                    status: "Open",
                    startDate: today,
                    endDate: "",
                });
            }
        }
    }, [open, initialData, defaultAssetId]);

    useEffect(() => {
        if (!open || initialData || !defaultAssetId) return;
        const row = allocated.find((x) => x.assetId === defaultAssetId);
        if (!row?.roomId) return;
        setFormData((prev) => (prev.assetId === defaultAssetId && !prev.roomId ? { ...prev, roomId: row.roomId } : prev));
    }, [open, initialData, defaultAssetId, allocated]);
    /* eslint-enable react-hooks/set-state-in-effect */

    useEffect(() => {
        if (!formData.startDate || !formData.frequency) {
            return;
        }

        if (formData.frequency === "One-time") {
            setFormData((prev) => ({ ...prev, endDate: "" }));
            return;
        }

        const startDate = new Date(formData.startDate);
        const endDate = new Date(startDate);

        switch (formData.frequency) {
            case "Daily":
                endDate.setDate(endDate.getDate() + 14);
                break;
            case "Weekly":
                endDate.setDate(endDate.getDate() + 7);
                break;
            case "Monthly":
                endDate.setMonth(endDate.getMonth() + 1);
                break;
            case "Quarterly":
                endDate.setMonth(endDate.getMonth() + 3);
                break;
            case "Yearly":
                endDate.setFullYear(endDate.getFullYear() + 1);
                break;
        }

        setFormData((prev) => ({
            ...prev,
            endDate: endDate.toISOString().split("T")[0],
        }));
    }, [formData.startDate, formData.frequency]);

    const resolveRoomId = (): string | undefined => {
        const row = allocated.find((a) => a.assetId === formData.assetId);
        if (row?.roomId) return row.roomId;
        if (initialData?.assetId === formData.assetId && initialData?.roomId) return initialData.roomId;
        return formData.roomId?.trim() || undefined;
    };

    const handleAssetSelect = (assetId: string) => {
        const row = allocated.find((a) => a.assetId === assetId);
        setFormData((prev) => ({
            ...prev,
            assetId,
            roomId: row?.roomId ?? (initialData?.assetId === assetId ? initialData.roomId ?? "" : ""),
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setValidationError(null);

        if (!formData.frequency?.trim() && !formData.description?.trim()) {
            setValidationError("Description is required when no schedule frequency is set.");
            return;
        }

        if (formData.frequency === "One-time") {
            if (!formData.startDate) {
                setValidationError("Start date is required for one-time maintenance.");
                return;
            }
        } else if (formData.frequency) {
            if (!formData.startDate) {
                setValidationError("Start date is required for recurring maintenance schedules.");
                return;
            }
            if (!formData.endDate) {
                setValidationError("End date is required for recurring maintenance schedules.");
                return;
            }
            if (new Date(formData.endDate) <= new Date(formData.startDate)) {
                setValidationError("End date must be after start date for recurring schedules.");
                return;
            }
        }

        try {
            if (initialData) {
                await updateRecordMutation.mutateAsync({
                    id: initialData.id,
                    payload: {
                        assetId: formData.assetId || initialData.assetId,
                        roomId: resolveRoomId(),
                        description: (formData.description ?? "").trim(),
                        priority: formData.priority as string,
                        type: formData.type as string,
                        frequency: formData.frequency as string,
                        status: formData.status as string,
                        startDate: formData.startDate,
                        endDate: formData.frequency === "One-time" ? undefined : formData.endDate,
                        cost: initialData.cost,
                        dateReported: initialData.dateReported,
                        diagnosisOutcome: initialData.diagnosisOutcome || undefined,
                        inspectionNotes: initialData.inspectionNotes || undefined,
                        quotationNotes: initialData.quotationNotes || undefined,
                        attachments: initialData.attachments,
                    },
                });
            } else if (formData.assetId) {
                const freq = (formData.frequency as string) || "One-time";
                if (freq !== "One-time") {
                    if (!recurringSeriesIdRef.current) {
                        recurringSeriesIdRef.current =
                            typeof crypto !== "undefined" && crypto.randomUUID
                                ? crypto.randomUUID()
                                : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
                    }
                }
                const roomId = resolveRoomId();
                await addRecordMutation.mutateAsync({
                    assetId: formData.assetId,
                    roomId,
                    description: (formData.description ?? "").trim(),
                    priority: (formData.priority as string) || "Medium",
                    status: "Pending",
                    type: (formData.type as string) || "Corrective",
                    frequency: freq,
                    startDate: formData.startDate || new Date().toISOString().split("T")[0],
                    endDate: freq === "One-time" ? undefined : formData.endDate,
                    scheduleSeriesId: freq !== "One-time" ? recurringSeriesIdRef.current ?? undefined : undefined,
                });
            } else {
                setValidationError("Please select an asset.");
                return;
            }
            onOpenChange(false);
        } catch {
            /* toast from hook */
        }
    };

    const showAllocHint = !initialData && !allocLoading && allocated.length === 0;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className={`max-w-[95vw] lg:max-w-3xl rounded-2xl border-border p-0 overflow-hidden flex flex-col max-h-[90vh] ${
                    enableGlassmorphism
                        ? "border border-white/20 bg-white/10 dark:bg-black/10 backdrop-blur-2xl ring-1 ring-white/10"
                        : ""
                }`}
            >
                <DialogHeader className="p-5 bg-muted/40 border-b border-border shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-primary/10 text-primary rounded-lg">
                            <Wrench size={18} />
                        </div>
                        <div>
                            <DialogTitle className="text-base font-semibold text-foreground">
                                {initialData ? "Edit Maintenance Record" : "New Maintenance Record"}
                            </DialogTitle>
                            <DialogDescription className="text-muted-foreground text-xs mt-0.5">
                                {initialData ? "Update maintenance details and status" : "Choose the allocated asset and room, then describe the work"}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <form id="maintenance-form" onSubmit={handleSubmit} className="p-5 space-y-5 flex-1 overflow-y-auto">
                    {validationError && (
                        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                            <span>{validationError}</span>
                        </div>
                    )}

                    {/* Section: Asset & location */}
                    <div className="border rounded-lg bg-card/50">
                        <div className="flex items-center gap-2 p-3 border-b bg-muted/20">
                            <MapPin className="h-4 w-4 text-primary shrink-0" />
                            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Asset & room</span>
                        </div>
                        <div className="p-4 space-y-4">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                                        <Layers size={12} /> Asset <span className="text-destructive">*</span>
                                    </Label>
                                    {allocLoading && !initialData ? (
                                        <Skeleton className="h-10 w-full" />
                                    ) : (
                                        <SearchableSelect
                                            value={formData.assetId || ""}
                                            onValueChange={handleAssetSelect}
                                            options={optionsWithFallback}
                                            placeholder="Search by name, code, room…"
                                            searchPlaceholder="Type to filter…"
                                            emptyMessage="No allocated assets match."
                                            aria-label="Asset and room"
                                            aria-required
                                        />
                                    )}
                                    <p className="text-[11px] text-muted-foreground leading-snug">
                                        Only assets with an active room allocation can be scheduled. Labels show asset and room together to avoid mix-ups.
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-medium text-muted-foreground">Preview</Label>
                                    <div className="rounded-lg border bg-muted/20 p-3 flex gap-3 min-h-[120px]">
                                        <div className="w-24 h-24 shrink-0 rounded-md overflow-hidden bg-muted border">
                                            {previewLoading ? (
                                                <Skeleton className="w-full h-full" />
                                            ) : previewAsset?.image ? (
                                                <img src={previewAsset.image} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-muted-foreground/40">
                                                    <Layers className="h-8 w-8" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0 space-y-1 text-sm">
                                            {previewLoading ? (
                                                <Skeleton className="h-4 w-3/4" />
                                            ) : (
                                                <>
                                                    <p className="font-medium truncate">{previewAsset?.desc || "Select an asset"}</p>
                                                    {previewAsset?.assetCode && (
                                                        <p className="text-xs font-mono text-muted-foreground">{previewAsset.assetCode}</p>
                                                    )}
                                                    {previewAsset?.categoryName && (
                                                        <p className="text-xs text-muted-foreground">{previewAsset.categoryName}</p>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section: Schedule */}
                    <Collapsible open={sectionScheduleOpen} onOpenChange={setSectionScheduleOpen}>
                        <div className="border rounded-lg bg-card/50 overflow-hidden">
                            <CollapsibleTrigger asChild>
                                <button
                                    type="button"
                                    className="flex w-full items-center justify-between p-3 border-b bg-muted/20 hover:bg-muted/40 transition-colors text-left"
                                >
                                    <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                        <Calendar className="h-4 w-4 text-primary" /> Schedule
                                    </span>
                                    {sectionScheduleOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                </button>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                                <div className="p-4 space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                                                <Wrench size={12} /> Type
                                            </Label>
                                            <Select
                                                value={formData.type}
                                                onValueChange={(v) => setFormData({ ...formData, type: v as MaintenanceRecord["type"] })}
                                            >
                                                <SelectTrigger className="w-full h-10 bg-background px-3 text-sm">
                                                    <SelectValue placeholder="Select type" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {["Preventive", "Corrective", "Upgrade", "Inspection"].map((t) => (
                                                        <SelectItem key={t} value={t}>
                                                            {t}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                                                <AlertTriangle size={12} /> Priority
                                            </Label>
                                            <Select
                                                value={formData.priority}
                                                onValueChange={(v) => setFormData({ ...formData, priority: v as MaintenanceRecord["priority"] })}
                                            >
                                                <SelectTrigger className="w-full h-10 px-3 text-sm bg-background">
                                                    <SelectValue placeholder="Select priority" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {["Low", "Medium", "High"].map((p) => (
                                                        <SelectItem key={p} value={p}>
                                                            {p}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2 sm:col-span-2">
                                            <Label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                                                <Calendar size={12} /> Frequency
                                            </Label>
                                            <Select
                                                value={formData.frequency}
                                                onValueChange={(v) => setFormData({ ...formData, frequency: v as MaintenanceRecord["frequency"] })}
                                            >
                                                <SelectTrigger className="w-full h-10 bg-background px-3 text-sm">
                                                    <SelectValue placeholder="Select frequency" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {["One-time", "Daily", "Weekly", "Monthly", "Quarterly", "Yearly"].map((f) => (
                                                        <SelectItem key={f} value={f}>
                                                            {f}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <Separator />
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                                                <Calendar size={12} /> Start date
                                            </Label>
                                            <Input
                                                type="date"
                                                value={formData.startDate}
                                                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                                min={new Date().toISOString().split("T")[0]}
                                                className="h-10 bg-background text-sm"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                                                <Calendar size={12} /> End date{" "}
                                                {formData.frequency && formData.frequency !== "One-time" && (
                                                    <span className="text-destructive">*</span>
                                                )}
                                            </Label>
                                            <Input
                                                type="date"
                                                value={formData.endDate}
                                                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                                min={formData.startDate || new Date().toISOString().split("T")[0]}
                                                disabled={formData.frequency === "One-time"}
                                                className="h-10 bg-background text-sm"
                                            />
                                            {formData.frequency === "One-time" && (
                                                <p className="text-[11px] text-muted-foreground">Not used for one-time tasks (not shown on the schedules table).</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </CollapsibleContent>
                        </div>
                    </Collapsible>

                    {/* Section: Details */}
                    <Collapsible open={sectionDetailsOpen} onOpenChange={setSectionDetailsOpen}>
                        <div className="border rounded-lg bg-card/50 overflow-hidden">
                            <CollapsibleTrigger asChild>
                                <button
                                    type="button"
                                    className="flex w-full items-center justify-between p-3 border-b bg-muted/20 hover:bg-muted/40 transition-colors text-left"
                                >
                                    <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                        <FileText className="h-4 w-4 text-primary" /> Description
                                    </span>
                                    {sectionDetailsOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                </button>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                                <div className="p-4">
                                    <Textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        placeholder="Describe the issue or planned maintenance…"
                                        className="min-h-[100px] bg-background text-sm resize-none"
                                    />
                                </div>
                            </CollapsibleContent>
                        </div>
                    </Collapsible>

                    {showAllocHint && (
                        <p className="text-xs text-muted-foreground">
                            No active allocations found. Assign assets to rooms under Allocations before scheduling maintenance.
                        </p>
                    )}
                </form>

                <DialogFooter className="p-5 bg-muted/40 border-t border-border shrink-0 flex justify-end gap-3 w-full">
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-10 text-sm">
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        form="maintenance-form"
                        className="h-10 text-sm px-4 bg-primary text-primary-foreground shadow-lg hover:bg-primary/90"
                        disabled={addRecordMutation.isPending || updateRecordMutation.isPending || (!!allocLoading && !initialData)}
                    >
                        {initialData ? "Save Changes" : "Submit Record"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
