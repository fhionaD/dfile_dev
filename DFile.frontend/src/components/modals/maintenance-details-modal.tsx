"use client";

import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusText } from "@/components/ui/status-text";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Wrench, Calendar, AlertTriangle, Package, RefreshCw, ChevronRight,
    ClipboardCheck, CheckCircle2, Search, FileQuestion, ArrowRight,
    Upload, FileText, PhilippinePeso, X
} from "lucide-react";
import { MaintenanceRecord } from "@/types/asset";
import { useAssets } from "@/hooks/use-assets";
import { useUpdateMaintenanceRecord, useUploadAttachment, useMarkBeyondRepair } from "@/hooks/use-maintenance";

interface MaintenanceDetailsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    record: MaintenanceRecord | null;
    onEdit?: () => void;
    onRequestReplacement?: (assetId: string) => void;
    onOpenInspectionModal?: (record: MaintenanceRecord) => void;
    enableGlassmorphism?: boolean;
}

const STATUS_FLOW = ["Open", "Inspection", "Quoted", "In Progress", "Completed"] as const;

const NEXT_STATUS: Record<string, string> = {
    "Open": "Inspection",
    "Inspection": "Quoted",
    "Quoted": "In Progress",
    "In Progress": "Completed",
    "Scheduled": "In Progress",
    "Pending": "Inspection",
};

const statusVariant: Record<string, "warning" | "info" | "success" | "muted" | "danger"> = {
    Open: "info",
    Inspection: "warning",
    Quoted: "muted",
    "In Progress": "warning",
    Completed: "success",
    Scheduled: "info",
    Pending: "warning",
    "Finance Review": "warning",
    "Waiting for Replacement": "warning",
};

const priorityVariant: Record<string, "success" | "warning" | "danger"> = {
    Low: "success",
    Medium: "warning",
    High: "danger",
};

export function MaintenanceDetailsModal({ open, onOpenChange, record, onEdit, onRequestReplacement, onOpenInspectionModal, enableGlassmorphism = false }: MaintenanceDetailsModalProps) {
    const { data: assets = [] } = useAssets();
    const updateMutation = useUpdateMaintenanceRecord();
    const uploadMutation = useUploadAttachment();
    const beyondRepairMutation = useMarkBeyondRepair();

    const [inspectionNotes, setInspectionNotes] = useState("");
    const [diagnosisOutcome, setDiagnosisOutcome] = useState<"Repairable" | "Not Repairable" | "No Fix Needed" | "">("");
    const [quotationNotes, setQuotationNotes] = useState("");
    const [quotationCost, setQuotationCost] = useState<number>(0);
    const [isAdvancing, setIsAdvancing] = useState(false);
    const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (record) {
            setInspectionNotes(record.inspectionNotes || "");
            setDiagnosisOutcome(record.diagnosisOutcome || "");
            setQuotationNotes(record.quotationNotes || "");
            setQuotationCost(record.cost || 0);
            setUploadedFiles(record.attachments ? record.attachments.split(",").filter(Boolean) : []);
        }
    }, [record]);

    if (!record) return null;

    const asset = assets.find(a => a.id === record.assetId);
    const assetName = asset ? asset.desc : record.assetId;
    const nextStatus = NEXT_STATUS[record.status];
    const currentStepIndex = STATUS_FLOW.indexOf(record.status as any);
    const isScheduled = record.status === "Scheduled" || record.status === "Pending";
    const isInspectionPhase = record.status === "Inspection";
    const isQuotedPhase = record.status === "Quoted";
    const isNotRepairable = record.diagnosisOutcome === "Not Repairable" || diagnosisOutcome === "Not Repairable";
    const financeReplacementFlow =
        record.status === "Finance Review" || record.status === "Waiting for Replacement";

    const buildPayload = (overrideStatus?: string) => ({
        assetId: record.assetId,
        description: record.description,
        status: overrideStatus || record.status,
        priority: record.priority,
        type: record.type,
        frequency: record.frequency,
        startDate: record.startDate,
        endDate: record.endDate,
        cost: quotationCost || record.cost,
        attachments: uploadedFiles.length > 0 ? uploadedFiles.join(",") : record.attachments,
        dateReported: record.dateReported,
        diagnosisOutcome: diagnosisOutcome || record.diagnosisOutcome || undefined,
        inspectionNotes: inspectionNotes || record.inspectionNotes || undefined,
        quotationNotes: quotationNotes || record.quotationNotes || undefined,
    });

    const handleAdvanceStatus = async () => {
        if (!nextStatus || !record) return;
        
        // If advancing to Inspection, open InspectionDiagnosisModal instead
        if (nextStatus === "Inspection") {
            if (onOpenInspectionModal) {
                onOpenInspectionModal(record);
                onOpenChange(false);
            }
            return;
        }
        
        if (isInspectionPhase && !diagnosisOutcome && !record.diagnosisOutcome) return;
        setIsAdvancing(true);
        try {
            await updateMutation.mutateAsync({ id: record.id, payload: buildPayload(nextStatus) });
            onOpenChange(false);
        } finally {
            setIsAdvancing(false);
        }
    };

    const handleSaveQuotation = async () => {
        if (!record) return;
        setIsAdvancing(true);
        try {
            await updateMutation.mutateAsync({ id: record.id, payload: buildPayload() });
            onOpenChange(false);
        } finally {
            setIsAdvancing(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const result = await uploadMutation.mutateAsync(file);
            setUploadedFiles(prev => [...prev, result.url]);
        } catch { /* handled by hook */ }
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleRemoveFile = (url: string) => {
        setUploadedFiles(prev => prev.filter(f => f !== url));
    };

    const handleMarkBeyondRepair = async () => {
        if (!record) return;
        setIsAdvancing(true);
        try {
            await beyondRepairMutation.mutateAsync(record.id);
            onOpenChange(false);
        } finally {
            setIsAdvancing(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className={`max-w-2xl rounded-2xl border-border p-0 overflow-hidden flex flex-col max-h-[90vh] ${
                enableGlassmorphism ? 'border border-white/20 bg-white/10 dark:bg-black/10 backdrop-blur-2xl ring-1 ring-white/10' : ''
            }`}>
                <DialogHeader className="p-6 bg-muted/40 border-b border-border shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 bg-primary/10 flex items-center justify-center text-primary rounded-xl">
                            <Wrench size={24} />
                        </div>
                        <div>
                            <DialogTitle className="text-lg font-semibold text-foreground">Maintenance</DialogTitle>
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                <Badge variant="secondary" className="font-mono text-xs">{record.requestId ?? record.id}</Badge>
                                <StatusText variant={statusVariant[record.status] ?? "muted"}>{record.status}</StatusText>
                                <StatusText variant={priorityVariant[record.priority] ?? "muted"}>{record.priority} Priority</StatusText>
                            </div>
                        </div>
                    </div>
                    <DialogDescription className="sr-only">Maintenance record details</DialogDescription>
                </DialogHeader>

                <div className="p-6 space-y-5 flex-1 overflow-y-auto">
                    {/* Status Stepper */}
                    <div>
                        <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                            <ChevronRight size={16} className="text-primary" /> Progress
                        </h4>
                        <div className="flex items-center gap-1 bg-muted/30 p-3 rounded-lg border border-border/50">
                            {STATUS_FLOW.map((step, i) => {
                                const stepIndex = STATUS_FLOW.indexOf(step);
                                const isCurrent = record.status === step;
                                const isPast = !isScheduled && currentStepIndex >= 0 && stepIndex < currentStepIndex;

                                return (
                                    <div key={step} className="flex items-center flex-1">
                                        <div className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium w-full justify-center transition-colors ${
                                            isCurrent ? "bg-primary text-primary-foreground shadow-sm" :
                                            isPast ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
                                            "bg-muted/50 text-muted-foreground"
                                        }`}>
                                            {isPast && <CheckCircle2 size={12} />}
                                            {isCurrent && step === "Inspection" && <Search size={12} />}
                                            {isCurrent && step === "Quoted" && <FileQuestion size={12} />}
                                            {isCurrent && step === "In Progress" && <Wrench size={12} />}
                                            {isCurrent && step === "Completed" && <CheckCircle2 size={12} />}
                                            {isCurrent && step === "Open" && <ClipboardCheck size={12} />}
                                            <span className="hidden sm:inline">{step}</span>
                                        </div>
                                        {i < STATUS_FLOW.length - 1 && (
                                            <ArrowRight size={14} className={`mx-0.5 shrink-0 ${isPast ? "text-emerald-500" : "text-muted-foreground/30"}`} />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        {isScheduled && (
                            <p className="text-xs text-muted-foreground mt-2 italic">
                                This is a {record.status.toLowerCase()} task — it follows a simplified flow.
                            </p>
                        )}
                    </div>

                    <Separator />

                    {/* Description */}
                    <div>
                        <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                            <AlertTriangle size={16} className="text-primary" /> Issue Description
                        </h4>
                        <p className="text-sm text-foreground bg-muted/10 p-4 border border-border/50 leading-relaxed rounded-lg">
                            {record.description}
                        </p>
                    </div>

                    <Separator />

                    {/* Asset & Type */}
                    <div>
                        <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                            <Package size={16} className="text-primary" /> Asset Information
                        </h4>
                        <div className="grid grid-cols-2 gap-4 text-sm bg-muted/10 p-4 border border-border/50 rounded-lg">
                            <div>
                                <p className="text-xs text-muted-foreground">Asset ID</p>
                                <Badge variant="secondary" className="font-mono text-xs mt-1">{record.assetId}</Badge>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Asset Name</p>
                                <p className="font-medium">{assetName || "—"}</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Type</p>
                                <p className="font-medium">{record.type}</p>
                            </div>
                            {record.frequency && (
                                <div>
                                    <p className="text-xs text-muted-foreground">Frequency</p>
                                    <p className="font-medium flex items-center gap-1.5"><RefreshCw size={12} />{record.frequency}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <Separator />

                    {/* Dates & Cost */}
                    <div>
                        <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                            <Calendar size={16} className="text-primary" /> Timeline
                        </h4>
                        <div className="grid grid-cols-2 gap-4 text-sm bg-muted/10 p-4 border border-border/50 rounded-lg">
                            <div>
                                <p className="text-xs text-muted-foreground">Date Reported</p>
                                <p className="font-medium">{record.dateReported ? new Date(record.dateReported).toLocaleDateString() : "—"}</p>
                            </div>
                            {record.startDate && (
                                <div>
                                    <p className="text-xs text-muted-foreground">Start Date</p>
                                    <p className="font-medium">{new Date(record.startDate).toLocaleDateString()}</p>
                                </div>
                            )}
                            {record.endDate && (
                                <div>
                                    <p className="text-xs text-muted-foreground">End Date</p>
                                    <p className="font-medium">{new Date(record.endDate).toLocaleDateString()}</p>
                                </div>
                            )}
                            {record.cost !== undefined && record.cost !== null && (
                                <div>
                                    <p className="text-xs text-muted-foreground">Cost</p>
                                    <p className="font-semibold">₱{record.cost.toLocaleString()}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Quotation Panel — enter cost, notes, attachments while status is Quoted */}
                    {(isQuotedPhase || record.quotationNotes || (record.status !== "Open" && record.status !== "Inspection" && record.cost)) && (
                        <>
                            <Separator />
                            <div>
                                <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                                    <PhilippinePeso size={16} className="text-primary" /> Quotation Details
                                </h4>
                                <div className="bg-muted/10 p-4 border border-border/50 rounded-lg space-y-4">
                                    {isQuotedPhase ? (
                                        <>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label className="text-xs font-medium text-muted-foreground">Repair Cost Estimate (₱)</Label>
                                                    <Input
                                                        type="number"
                                                        step="0.01"
                                                        value={quotationCost || ""}
                                                        onChange={(e) => setQuotationCost(Number(e.target.value))}
                                                        placeholder="0.00"
                                                        className="h-9 bg-background text-sm"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-xs font-medium text-muted-foreground">Quotation Notes</Label>
                                                <Textarea
                                                    value={quotationNotes}
                                                    onChange={(e) => setQuotationNotes(e.target.value)}
                                                    placeholder="Describe repair scope, parts needed, labor estimate..."
                                                    className="min-h-[60px] bg-background text-sm resize-none"
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-xs font-medium text-muted-foreground">Attachments (Optional)</Label>
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        ref={fileInputRef}
                                                        type="file"
                                                        className="hidden"
                                                        onChange={handleFileUpload}
                                                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xlsx,.xls"
                                                    />
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => fileInputRef.current?.click()}
                                                        disabled={uploadMutation.isPending}
                                                    >
                                                        <Upload size={14} className="mr-1.5" />
                                                        {uploadMutation.isPending ? "Uploading..." : "Upload File"}
                                                    </Button>
                                                    <span className="text-xs text-muted-foreground">Max 10MB</span>
                                                </div>
                                                {uploadedFiles.length > 0 && (
                                                    <div className="mt-2 space-y-1">
                                                        {uploadedFiles.map((url) => (
                                                            <div key={url} className="flex items-center gap-2 text-xs bg-muted/50 p-2 rounded-md">
                                                                <FileText size={12} className="text-muted-foreground shrink-0" />
                                                                <span className="truncate flex-1 text-foreground">{url.split("/").pop()}</span>
                                                                <Button type="button" size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={() => handleRemoveFile(url)}>
                                                                    <X size={10} />
                                                                </Button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            <Button
                                                size="sm"
                                                onClick={handleSaveQuotation}
                                                disabled={isAdvancing}
                                                className="w-full bg-primary text-primary-foreground"
                                            >
                                                <ClipboardCheck size={14} className="mr-2" /> Save Quotation
                                            </Button>
                                        </>
                                    ) : (
                                        <>
                                            {record.cost !== undefined && record.cost !== null && (
                                                <div>
                                                    <p className="text-xs text-muted-foreground mb-1">Cost Estimate</p>
                                                    <p className="text-lg font-semibold">₱{record.cost.toLocaleString()}</p>
                                                </div>
                                            )}
                                            {record.quotationNotes && (
                                                <div>
                                                    <p className="text-xs text-muted-foreground mb-1">Notes</p>
                                                    <p className="text-sm">{record.quotationNotes}</p>
                                                </div>
                                            )}
                                            {record.attachments && (
                                                <div>
                                                    <p className="text-xs text-muted-foreground mb-1">Attachments</p>
                                                    <div className="space-y-1">
                                                        {record.attachments.split(",").filter(Boolean).map((url) => (
                                                            <a
                                                                key={url}
                                                                href={url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="flex items-center gap-2 text-xs text-primary hover:underline"
                                                            >
                                                                <FileText size={12} /> {url.split("/").pop()}
                                                            </a>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        </>
                    )}

                    {/* Beyond Repair Warning — hidden once Finance owns replacement (avoid duplicate vs inspection workflow) */}
                    {isNotRepairable && !financeReplacementFlow && (
                        <>
                            <Separator />
                            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
                                <div className="flex items-start gap-3">
                                    <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                                    <div className="flex-1">
                                        <p className="text-sm font-semibold text-red-700 dark:text-red-400">Asset Diagnosed as Not Repairable</p>
                                        <p className="text-xs text-red-600/80 dark:text-red-400/70 mt-1">
                                            Mark this asset as beyond repair to update its lifecycle status and notify the tenant admin. Then create a replacement purchase order.
                                        </p>
                                        <div className="flex gap-2 mt-3">
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                onClick={handleMarkBeyondRepair}
                                                disabled={isAdvancing || beyondRepairMutation.isPending}
                                            >
                                                <AlertTriangle size={14} className="mr-2" />
                                                {beyondRepairMutation.isPending ? "Processing..." : "Mark Beyond Repair"}
                                            </Button>
                                            {onRequestReplacement && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => onRequestReplacement(record.assetId)}
                                                >
                                                    <Package size={14} className="mr-2" /> Create Replacement PO
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <DialogFooter className="p-6 bg-muted/40 border-t border-border shrink-0 flex justify-between gap-3">
                    <div className="flex gap-2 flex-1">
                        {onEdit && record.status !== "Completed" && (
                            <Button variant="outline" onClick={onEdit}>
                                <Wrench size={16} className="mr-2" /> Edit
                            </Button>
                        )}
                    </div>
                    <div className="flex gap-2">
                        {nextStatus && record.status !== "Completed" && !(isInspectionPhase && !record.diagnosisOutcome) && (
                            <Button
                                onClick={handleAdvanceStatus}
                                disabled={isAdvancing}
                                className="bg-primary text-primary-foreground shadow-md hover:bg-primary/90"
                            >
                                <ArrowRight size={16} className="mr-2" />
                                {isAdvancing ? "Updating..." : `Move to ${nextStatus}`}
                            </Button>
                        )}
                        <Button variant="outline" onClick={() => onOpenChange(false)}>
                            Close
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
