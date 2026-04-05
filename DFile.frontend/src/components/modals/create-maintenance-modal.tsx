"use client";

import { useState, useEffect, useRef } from "react";
import { Wrench, AlertTriangle, FileText, Calendar, Layers } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Asset, MaintenanceRecord } from "@/types/asset";
import { useAssets } from "@/hooks/use-assets";
import { useAddMaintenanceRecord, useUpdateMaintenanceRecord } from "@/hooks/use-maintenance";

interface CreateMaintenanceModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialData?: MaintenanceRecord | null;
    defaultAssetId?: string | null;
    /** @deprecated No longer used; estimated cost is captured only in the repairable inspection flow. */
    enableAutoCost?: boolean;
    enableGlassmorphism?: boolean;
}

export function CreateMaintenanceModal({
    open,
    onOpenChange,
    initialData,
    defaultAssetId,
    enableGlassmorphism = false,
}: CreateMaintenanceModalProps) {
    const { data: assets = [] } = useAssets();
    const addRecordMutation = useAddMaintenanceRecord();
    const updateRecordMutation = useUpdateMaintenanceRecord();
    const [validationError, setValidationError] = useState<string | null>(null);
    /** Stable per modal open for recurring creates — avoids duplicate batches on double submit. */
    const recurringSeriesIdRef = useRef<string | null>(null);

    const [formData, setFormData] = useState<Partial<MaintenanceRecord>>({
        assetId: "",
        description: "",
        priority: "Medium",
        type: "Corrective",
        frequency: "One-time",
        status: "Open",
        startDate: "",
        endDate: "",
    });

    const selectedAsset: Asset | undefined = assets.find((a) => a.id === formData.assetId);

    /* Dialog open / defaults: intentional state sync (not external subscription). */
    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        if (open) {
            setValidationError(null);
            recurringSeriesIdRef.current = null;
            if (initialData) {
                setFormData({
                    assetId: initialData.assetId || "",
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
                setFormData({
                    assetId: defaultAssetId || "",
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
    /* eslint-enable react-hooks/set-state-in-effect */

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setValidationError(null);

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
                        description: formData.description || "No description provided",
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
                await addRecordMutation.mutateAsync({
                    assetId: formData.assetId,
                    description: formData.description || "No description provided",
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

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className={`max-w-[95vw] lg:max-w-[1400px] rounded-2xl border-border p-0 overflow-hidden flex flex-col max-h-[90vh] ${
                    enableGlassmorphism
                        ? "border border-white/20 bg-white/10 dark:bg-black/10 backdrop-blur-2xl ring-1 ring-white/10"
                        : ""
                }`}
            >
                <DialogHeader className="p-6 bg-muted/40 border-b border-border shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/10  text-primary">
                            <Wrench size={20} />
                        </div>
                        <div>
                            <DialogTitle className="text-lg font-semibold text-foreground">
                                {initialData ? "Edit Maintenance Record" : "New Maintenance Record"}
                            </DialogTitle>
                            <DialogDescription className="text-muted-foreground text-xs mt-1">
                                {initialData ? "Update maintenance details and status" : "Schedule maintenance or report an issue"}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <form id="maintenance-form" onSubmit={handleSubmit} className="p-6 space-y-6 flex-1 overflow-y-auto">
                    {validationError && (
                        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                            <span>{validationError}</span>
                        </div>
                    )}

                    <div className="flex flex-col lg:flex-row gap-6">
                        <div
                            className={`transition-all duration-500 ease-in-out ${
                                selectedAsset ? "opacity-100 translate-x-0" : "opacity-0 overflow-hidden"
                            } ${selectedAsset ? "lg:w-80" : "lg:w-0 -translate-x-4"}`}
                        >
                            {selectedAsset && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-500">
                                    <div className="relative aspect-square lg:aspect-square rounded-xl overflow-hidden bg-muted border border-border shadow-sm max-w-[200px] lg:max-w-none mx-auto lg:mx-0">
                                        {selectedAsset.image ? (
                                            <img
                                                src={selectedAsset.image}
                                                alt={selectedAsset.desc || "Asset"}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <Layers className="h-16 w-16 text-muted-foreground/30" />
                                            </div>
                                        )}
                                    </div>

                                    <div className="hidden lg:block space-y-3 p-4 rounded-lg bg-muted/30 border border-border/50">
                                        <div>
                                            <p className="text-xs font-medium text-muted-foreground mb-1">Asset Name</p>
                                            <p className="text-sm font-semibold text-foreground">{selectedAsset.desc || "Unnamed Asset"}</p>
                                        </div>
                                        {selectedAsset.assetCode && (
                                            <div>
                                                <p className="text-xs font-medium text-muted-foreground mb-1">Asset Code</p>
                                                <p className="text-sm font-mono text-foreground">{selectedAsset.assetCode}</p>
                                            </div>
                                        )}
                                        {selectedAsset.tagNumber && (
                                            <div>
                                                <p className="text-xs font-medium text-muted-foreground mb-1">Tag Number</p>
                                                <p className="text-sm font-mono text-foreground">{selectedAsset.tagNumber}</p>
                                            </div>
                                        )}
                                        {selectedAsset.categoryName && (
                                            <div>
                                                <p className="text-xs font-medium text-muted-foreground mb-1">Category</p>
                                                <p className="text-sm text-foreground">{selectedAsset.categoryName}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex-1 space-y-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                                    <Layers size={12} /> Asset to Maintain <span className="text-destructive">*</span>
                                </Label>
                                <Select value={formData.assetId || ""} onValueChange={(v) => setFormData({ ...formData, assetId: v })}>
                                    <SelectTrigger className="w-full h-10 bg-background px-3 text-sm">
                                        <SelectValue placeholder="Select asset..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {assets.map((asset) => (
                                            <SelectItem key={asset.id} value={asset.id}>
                                                {asset.desc}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                                        <Wrench size={12} /> Type
                                    </Label>
                                    <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v as MaintenanceRecord["type"] })}>
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
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
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

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                                        <Calendar size={12} /> Start Date
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
                                        <Calendar size={12} /> End Date{" "}
                                        {formData.frequency && formData.frequency !== "One-time" && <span className="text-destructive">*</span>}
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
                                        <p className="text-xs text-muted-foreground">End date not needed for one-time maintenance</p>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                                    <FileText size={12} /> Description
                                </Label>
                                <Textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Describe the issue or plan in detail..."
                                    className="min-h-[100px] bg-background text-sm resize-none"
                                />
                            </div>
                        </div>
                    </div>
                </form>

                <DialogFooter className="p-6 bg-muted/40 border-t border-border shrink-0 flex justify-end gap-3 w-full">
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-10 text-sm">
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        form="maintenance-form"
                        className="h-10 text-sm px-4 bg-primary text-primary-foreground shadow-lg hover:bg-primary/90"
                        disabled={addRecordMutation.isPending || updateRecordMutation.isPending}
                    >
                        {initialData ? "Save Changes" : "Submit Record"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
