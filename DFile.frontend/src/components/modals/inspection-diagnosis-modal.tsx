"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ClipboardCheck, ShieldAlert, ShieldCheck, CheckCircle, Upload, FileText, X, PhilippinePeso } from "lucide-react";
import { useUploadAttachment, type InspectionWorkflowPayload } from "@/hooks/use-maintenance";
import { useAsset } from "@/hooks/use-assets";
import type { MaintenanceRecord } from "@/types/asset";
import { Skeleton } from "@/components/ui/skeleton";

interface InspectionDiagnosisModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (data: InspectionWorkflowPayload) => void | Promise<void>;
    isLoading?: boolean;
    /** Resolved name when asset detail is not loaded */
    assetName?: string;
    assetId?: string | null;
    maintenanceRecord?: MaintenanceRecord | null;
    enableGlassmorphism?: boolean;
}

const REPAIR_NOTE_SHORTCUTS = [
    "Damaged housing",
    "Motor failure",
    "Electrical fault",
    "Worn bearings",
    "Leak detected",
    "Calibration drift",
    "Software fault",
];

const NO_FIX_SHORTCUTS = [
    "Visual inspection",
    "Functional test",
    "No damage",
    "Minor wear",
    "All functioning",
    "Operating normally",
    "Safety verified",
    "Performance OK",
];

function formatMoneyPhp(n: number | undefined): string {
    if (n == null || Number.isNaN(n)) return "—";
    return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(n);
}

export function InspectionDiagnosisModal({
    open,
    onOpenChange,
    onSubmit,
    isLoading,
    assetName,
    assetId,
    maintenanceRecord,
    enableGlassmorphism = false,
}: InspectionDiagnosisModalProps) {
    const uploadMutation = useUploadAttachment();
    const { data: asset, isLoading: assetLoading } = useAsset(assetId ?? "", {
        enabled: open && !!assetId,
    });
    const [outcome, setOutcome] = useState<"" | "Repairable" | "Not Repairable" | "No Fix Needed">("");
    const [detailNotes, setDetailNotes] = useState("");
    const [estimatedRepairCost, setEstimatedRepairCost] = useState<string>("");
    const [linkedPurchaseOrderId, setLinkedPurchaseOrderId] = useState("");
    /** When true, replacement PO id is required before submit. */
    const [linkReplacementPoNow, setLinkReplacementPoNow] = useState(false);
    const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);

    const reset = () => {
        setOutcome("");
        setDetailNotes("");
        setEstimatedRepairCost("");
        setLinkedPurchaseOrderId("");
        setLinkReplacementPoNow(false);
        setUploadedUrls([]);
    };

    const handleClose = (v: boolean) => {
        if (!v) reset();
        onOpenChange(v);
    };

    const appendShortcut = (shortcut: string) => {
        setDetailNotes((prev) => {
            if (!prev.trim()) return shortcut;
            const sep = prev.endsWith(".") || prev.endsWith(",") ? " " : ". ";
            return `${prev}${sep}${shortcut}`;
        });
    };

    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const res = await uploadMutation.mutateAsync(file);
            setUploadedUrls((u) => [...u, res.url]);
        } catch {
            /* toast in hook */
        }
        e.target.value = "";
    };

    const canSubmit =
        outcome === "No Fix Needed"
            ? detailNotes.trim().length > 0
            : outcome === "Repairable"
              ? detailNotes.trim().length > 0 && parseFloat(estimatedRepairCost) > 0
              : outcome === "Not Repairable"
                ? detailNotes.trim().length > 0 &&
                  (!linkReplacementPoNow || linkedPurchaseOrderId.trim().length > 0)
                : false;

    const handleSubmit = async () => {
        if (!canSubmit || !outcome) return;
        const payload: InspectionWorkflowPayload = { outcome };
        if (outcome === "No Fix Needed") {
            payload.detailNotes = detailNotes.trim();
        } else if (outcome === "Repairable") {
            payload.detailNotes = detailNotes.trim();
            payload.estimatedRepairCost = parseFloat(estimatedRepairCost);
            if (uploadedUrls.length) payload.attachments = uploadedUrls.join(",");
        } else {
            payload.detailNotes = detailNotes.trim();
            if (linkReplacementPoNow && linkedPurchaseOrderId.trim())
                payload.linkedPurchaseOrderId = linkedPurchaseOrderId.trim();
        }
        await onSubmit(payload);
        reset();
    };

    const displayAssetName = maintenanceRecord?.assetName || asset?.desc || assetName || "—";
    const displayRoom =
        [maintenanceRecord?.roomCode, maintenanceRecord?.roomName].filter(Boolean).join(" · ") ||
        asset?.room ||
        "—";
    const displayFloor = maintenanceRecord?.roomFloor?.trim() || "—";
    const displayManufacturer = asset?.manufacturer?.trim() || "—";
    const displayModel = asset?.model?.trim() || "—";
    const displayTaskDescription = maintenanceRecord?.description?.trim() || "—";
    const replacementCost = asset?.purchasePrice ?? asset?.value;
    const displayCategory = asset?.categoryName || maintenanceRecord?.categoryName || "—";
    const displaySubCategory = asset?.roomSubCategoryName?.trim() || "—";
    const displayUsefulLife = asset?.usefulLifeYears != null ? `${asset.usefulLifeYears} yr` : "—";
    const displaySalvage =
        asset?.salvageValue != null
            ? formatMoneyPhp(asset.salvageValue)
            : asset?.salvagePercentage != null
              ? `${asset.salvagePercentage}%`
              : "—";

    const showAssetPanel = outcome === "Repairable" || outcome === "Not Repairable";

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent
                className={`sm:max-w-xl max-h-[90vh] overflow-y-auto ${
                    enableGlassmorphism
                        ? "border border-white/20 bg-white/10 dark:bg-black/10 backdrop-blur-2xl ring-1 ring-white/10"
                        : ""
                }`}
            >
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ClipboardCheck className="h-5 w-5 text-primary" />
                        Inspection
                    </DialogTitle>
                    <DialogDescription>
                        Choose exactly one outcome. The form shows asset context for repair and replacement paths.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-5 py-2">
                    <div className="space-y-3">
                        <Label>Result</Label>
                        <div className="space-y-2">
                            <button
                                type="button"
                                onClick={() => setOutcome("Repairable")}
                                className={`w-full flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors text-left ${
                                    outcome === "Repairable"
                                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 ring-1 ring-emerald-500"
                                        : "border-border hover:bg-muted/50"
                                }`}
                            >
                                <ShieldCheck className={`h-5 w-5 shrink-0 ${outcome === "Repairable" ? "text-emerald-600" : "text-muted-foreground"}`} />
                                <div>
                                    <p className="text-sm font-medium">Repairable</p>
                                    <p className="text-xs text-muted-foreground">Submit repair scope, photos, and cost to Finance</p>
                                </div>
                            </button>
                            <button
                                type="button"
                                onClick={() => setOutcome("Not Repairable")}
                                className={`w-full flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors text-left ${
                                    outcome === "Not Repairable"
                                        ? "border-red-500 bg-red-50 dark:bg-red-950/30 ring-1 ring-red-500"
                                        : "border-border hover:bg-muted/50"
                                }`}
                            >
                                <ShieldAlert className={`h-5 w-5 shrink-0 ${outcome === "Not Repairable" ? "text-red-600" : "text-muted-foreground"}`} />
                                <div>
                                    <p className="text-sm font-medium">Not Repairable</p>
                                    <p className="text-xs text-muted-foreground">Link a replacement PO for Finance approval</p>
                                </div>
                            </button>
                            <button
                                type="button"
                                onClick={() => setOutcome("No Fix Needed")}
                                className={`w-full flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors text-left ${
                                    outcome === "No Fix Needed"
                                        ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30 ring-1 ring-blue-500"
                                        : "border-border hover:bg-muted/50"
                                }`}
                            >
                                <CheckCircle className={`h-5 w-5 shrink-0 ${outcome === "No Fix Needed" ? "text-blue-600" : "text-muted-foreground"}`} />
                                <div>
                                    <p className="text-sm font-medium">No Fix Needed</p>
                                    <p className="text-xs text-muted-foreground">Complete immediately — no Finance step</p>
                                </div>
                            </button>
                        </div>
                    </div>

                    {showAssetPanel && (
                        <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Asset details</p>
                            {assetLoading && !!assetId ? (
                                <Skeleton className="h-24 w-full" />
                            ) : (
                                <>
                                    {outcome === "Not Repairable" && asset?.image && (
                                        <div className="flex justify-center sm:justify-start">
                                            <img
                                                src={asset.image}
                                                alt=""
                                                className="max-h-36 max-w-full rounded-md border object-contain bg-background"
                                            />
                                        </div>
                                    )}
                                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                        <div>
                                            <dt className="text-xs text-muted-foreground">Asset name</dt>
                                            <dd className="font-medium">{displayAssetName}</dd>
                                        </div>
                                        {outcome === "Not Repairable" && (
                                            <>
                                                <div>
                                                    <dt className="text-xs text-muted-foreground">Category</dt>
                                                    <dd>{displayCategory}</dd>
                                                </div>
                                                <div>
                                                    <dt className="text-xs text-muted-foreground">Room sub-category</dt>
                                                    <dd>{displaySubCategory}</dd>
                                                </div>
                                                <div>
                                                    <dt className="text-xs text-muted-foreground">Cost</dt>
                                                    <dd className="font-mono">{formatMoneyPhp(replacementCost)}</dd>
                                                </div>
                                                <div>
                                                    <dt className="text-xs text-muted-foreground">Useful life</dt>
                                                    <dd>{displayUsefulLife}</dd>
                                                </div>
                                                <div>
                                                    <dt className="text-xs text-muted-foreground">Salvage value</dt>
                                                    <dd className="font-mono">{displaySalvage}</dd>
                                                </div>
                                            </>
                                        )}
                                        <div>
                                            <dt className="text-xs text-muted-foreground">Manufacturer</dt>
                                            <dd>{displayManufacturer}</dd>
                                        </div>
                                        <div>
                                            <dt className="text-xs text-muted-foreground">Model number</dt>
                                            <dd className="font-mono text-xs">{displayModel}</dd>
                                        </div>
                                        <div>
                                            <dt className="text-xs text-muted-foreground">Assigned room</dt>
                                            <dd>{displayRoom}</dd>
                                        </div>
                                        <div>
                                            <dt className="text-xs text-muted-foreground">Floor</dt>
                                            <dd>{displayFloor}</dd>
                                        </div>
                                        <div className="sm:col-span-2">
                                            <dt className="text-xs text-muted-foreground">Schedule / task description</dt>
                                            <dd className="text-foreground/90">{displayTaskDescription}</dd>
                                        </div>
                                        {outcome === "Repairable" && (
                                            <div className="sm:col-span-2">
                                                <dt className="text-xs text-muted-foreground">Cost (reference)</dt>
                                                <dd className="font-mono">{formatMoneyPhp(replacementCost)}</dd>
                                            </div>
                                        )}
                                    </dl>
                                </>
                            )}
                        </div>
                    )}

                    {outcome === "Repairable" && (
                        <div className="space-y-4 border-t pt-4">
                            <div className="space-y-2">
                                <Label>Repair description / details</Label>
                                <div className="p-3 rounded-lg border bg-muted/30">
                                    <p className="text-xs text-muted-foreground mb-2">Shortcuts:</p>
                                    <div className="flex flex-wrap gap-2 max-h-20 overflow-y-auto">
                                        {REPAIR_NOTE_SHORTCUTS.map((s) => (
                                            <button
                                                key={s}
                                                type="button"
                                                onClick={() => appendShortcut(s)}
                                                className="px-2 py-1 text-xs rounded-md bg-background border border-border hover:bg-primary/10"
                                            >
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <Textarea
                                    value={detailNotes}
                                    onChange={(e) => setDetailNotes(e.target.value)}
                                    rows={4}
                                    placeholder="Describe required repair work..."
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <PhilippinePeso className="h-3.5 w-3.5" /> Estimated repair cost
                                </Label>
                                <Input
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    value={estimatedRepairCost}
                                    onChange={(e) => setEstimatedRepairCost(e.target.value)}
                                    placeholder="0.00"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Damaged-part images (optional)</Label>
                                <div className="flex flex-wrap gap-2 items-center">
                                    <label className="cursor-pointer">
                                        <input type="file" className="hidden" accept="image/*" onChange={handleFile} />
                                        <span className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-md border border-border bg-background hover:bg-muted">
                                            <Upload className="h-4 w-4" /> Upload
                                        </span>
                                    </label>
                                    {uploadMutation.isPending && <span className="text-xs text-muted-foreground">Uploading…</span>}
                                </div>
                                {uploadedUrls.length > 0 && (
                                    <ul className="space-y-1 text-xs">
                                        {uploadedUrls.map((url) => (
                                            <li key={url} className="flex items-center gap-2">
                                                <FileText className="h-3 w-3 shrink-0" />
                                                <span className="truncate flex-1">{url.split("/").pop()}</span>
                                                <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setUploadedUrls((u) => u.filter((x) => x !== url))}>
                                                    <X className="h-3 w-3" />
                                                </Button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    )}

                    {outcome === "Not Repairable" && (
                        <div className="space-y-4 border-t pt-4">
                            <p className="text-xs text-muted-foreground">
                                This sends the case to <strong>Finance</strong> for approval. After approval, Procurement can fulfill a PO if needed, or Finance can register a
                                replacement if you already have one.
                            </p>
                            <div className="space-y-2">
                                <Label>Why not repairable?</Label>
                                <Textarea
                                    value={detailNotes}
                                    onChange={(e) => setDetailNotes(e.target.value)}
                                    rows={4}
                                    placeholder="Explain why replacement is required..."
                                />
                            </div>
                            <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
                                <p className="text-xs font-medium text-foreground">Replacement purchase order</p>
                                <div className="flex flex-col gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setLinkReplacementPoNow(false);
                                            setLinkedPurchaseOrderId("");
                                        }}
                                        className={`text-left rounded-md border px-3 py-2 text-sm transition-colors ${
                                            !linkReplacementPoNow
                                                ? "border-primary bg-primary/10 ring-1 ring-primary"
                                                : "border-border hover:bg-muted/50"
                                        }`}
                                    >
                                        No PO yet — Finance reviews first
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setLinkReplacementPoNow(true)}
                                        className={`text-left rounded-md border px-3 py-2 text-sm transition-colors ${
                                            linkReplacementPoNow
                                                ? "border-primary bg-primary/10 ring-1 ring-primary"
                                                : "border-border hover:bg-muted/50"
                                        }`}
                                    >
                                        Link an existing replacement PO
                                    </button>
                                </div>
                                {linkReplacementPoNow && (
                                    <div className="space-y-2 pt-1">
                                        <Label htmlFor="nr-po-id">Purchase order ID</Label>
                                        <Input
                                            id="nr-po-id"
                                            value={linkedPurchaseOrderId}
                                            onChange={(e) => setLinkedPurchaseOrderId(e.target.value)}
                                            placeholder="Paste PO id from Procurement"
                                        />
                                        <p className="text-xs text-muted-foreground">The PO must belong to your organization.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {outcome === "No Fix Needed" && (
                        <div className="space-y-4 border-t pt-4">
                            <div className="space-y-2">
                                <Label>Description</Label>
                                <div className="p-3 rounded-lg border bg-muted/30">
                                    <p className="text-xs text-muted-foreground mb-2">Shortcuts:</p>
                                    <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                                        {NO_FIX_SHORTCUTS.map((s) => (
                                            <button
                                                key={s}
                                                type="button"
                                                onClick={() => appendShortcut(s)}
                                                className="px-2 py-1 text-xs rounded-md bg-background border border-border hover:bg-primary/10"
                                            >
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <Textarea value={detailNotes} onChange={(e) => setDetailNotes(e.target.value)} rows={4} placeholder="Brief notes..." />
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => handleClose(false)} disabled={isLoading}>
                        Cancel
                    </Button>
                    <Button onClick={() => void handleSubmit()} disabled={!canSubmit || isLoading}>
                        {isLoading ? "Submitting…" : "Submit"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
