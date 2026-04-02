"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ClipboardCheck, ShieldAlert, ShieldCheck, CheckCircle } from "lucide-react";

interface InspectionDiagnosisModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (data: { inspectionNotes: string; diagnosisOutcome: "Repairable" | "Not Repairable" | "No Fix Needed" }) => void;
    isLoading?: boolean;
    assetName?: string;
    enableGlassmorphism?: boolean;
}

const INSPECTION_NOTE_SHORTCUTS = [
    "Visual inspection",
    "Functional test",
    "No damage",
    "Minor wear",
    "Requires cleaning",
    "Lubrication needed",
    "All functioning",
    "Operating normally",
    "Safety verified",
    "Performance OK",
    "Calibration required",
    "Parts worn",
];

export function InspectionDiagnosisModal({ open, onOpenChange, onSubmit, isLoading, assetName, enableGlassmorphism = false }: InspectionDiagnosisModalProps) {
    const [inspectionNotes, setInspectionNotes] = useState("");
    const [diagnosisOutcome, setDiagnosisOutcome] = useState<"Repairable" | "Not Repairable" | "No Fix Needed" | "">("");

    const canSubmit = inspectionNotes.trim().length > 0 && diagnosisOutcome !== "";

    const handleSubmit = () => {
        if (!canSubmit) return;
        onSubmit({ inspectionNotes, diagnosisOutcome: diagnosisOutcome as "Repairable" | "Not Repairable" | "No Fix Needed" });
    };

    const handleClose = (v: boolean) => {
        if (!v) {
            setInspectionNotes("");
            setDiagnosisOutcome("");
        }
        onOpenChange(v);
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className={`sm:max-w-md ${
                enableGlassmorphism ? 'border border-white/20 bg-white/10 dark:bg-black/10 backdrop-blur-2xl ring-1 ring-white/10' : ''
            }`}>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ClipboardCheck className="h-5 w-5 text-primary" />
                        Inspection & Diagnosis
                    </DialogTitle>
                    <DialogDescription>
                        {assetName ? `Inspecting: ${assetName}` : "Fill in the inspection details below."}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-5 py-2">
                    <div className="space-y-2">
                        <Label htmlFor="inspection-notes">Inspection Notes <span className="text-destructive">*</span></Label>
                        <div className="space-y-3">
                            {/* Shortcut chips */}
                            <div className="p-3 rounded-lg border bg-muted/30">
                                <p className="text-xs text-muted-foreground mb-2">Click to add shortcuts:</p>
                                <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto pr-2">
                                    {INSPECTION_NOTE_SHORTCUTS.map((shortcut, index) => (
                                        <button
                                            key={index}
                                            type="button"
                                            onClick={() => {
                                                const newText = inspectionNotes 
                                                    ? `${inspectionNotes}${inspectionNotes.endsWith('.') || inspectionNotes.endsWith(',') ? ' ' : '. '}${shortcut}`
                                                    : shortcut;
                                                setInspectionNotes(newText);
                                            }}
                                            className="px-2.5 py-1 text-xs font-medium rounded-md bg-background border border-border hover:bg-primary/10 hover:border-primary/50 hover:text-primary transition-all duration-200 cursor-pointer active:scale-95 shrink-0"
                                        >
                                            {shortcut}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <Textarea
                                id="inspection-notes"
                                placeholder="Click shortcuts above or type custom inspection notes..."
                                value={inspectionNotes}
                                onChange={(e) => setInspectionNotes(e.target.value)}
                                rows={5}
                            />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <Label>Diagnosis Outcome <span className="text-destructive">*</span></Label>
                        <div className="space-y-2">
                            <button
                                type="button"
                                onClick={() => setDiagnosisOutcome("Repairable")}
                                className={`w-full flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors text-left ${
                                    diagnosisOutcome === "Repairable"
                                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 ring-1 ring-emerald-500"
                                        : "border-border hover:bg-muted/50"
                                }`}
                            >
                                <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                    diagnosisOutcome === "Repairable" ? "border-emerald-500" : "border-muted-foreground/40"
                                }`}>
                                    {diagnosisOutcome === "Repairable" && <div className="h-2 w-2 rounded-full bg-emerald-500" />}
                                </div>
                                <ShieldCheck className={`h-5 w-5 shrink-0 ${diagnosisOutcome === "Repairable" ? "text-emerald-600" : "text-muted-foreground"}`} />
                                <div>
                                    <p className="text-sm font-medium">Repairable</p>
                                    <p className="text-xs text-muted-foreground">Asset can be repaired, proceed to quotation</p>
                                </div>
                            </button>
                            <button
                                type="button"
                                onClick={() => setDiagnosisOutcome("Not Repairable")}
                                className={`w-full flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors text-left ${
                                    diagnosisOutcome === "Not Repairable"
                                        ? "border-red-500 bg-red-50 dark:bg-red-950/30 ring-1 ring-red-500"
                                        : "border-border hover:bg-muted/50"
                                }`}
                            >
                                <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                    diagnosisOutcome === "Not Repairable" ? "border-red-500" : "border-muted-foreground/40"
                                }`}>
                                    {diagnosisOutcome === "Not Repairable" && <div className="h-2 w-2 rounded-full bg-red-500" />}
                                </div>
                                <ShieldAlert className={`h-5 w-5 shrink-0 ${diagnosisOutcome === "Not Repairable" ? "text-red-600" : "text-muted-foreground"}`} />
                                <div>
                                    <p className="text-sm font-medium">Not Repairable</p>
                                    <p className="text-xs text-muted-foreground">Asset is beyond repair, needs replacement</p>
                                </div>
                            </button>
                            <button
                                type="button"
                                onClick={() => setDiagnosisOutcome("No Fix Needed")}
                                className={`w-full flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors text-left ${
                                    diagnosisOutcome === "No Fix Needed"
                                        ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30 ring-1 ring-blue-500"
                                        : "border-border hover:bg-muted/50"
                                }`}
                            >
                                <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                    diagnosisOutcome === "No Fix Needed" ? "border-blue-500" : "border-muted-foreground/40"
                                }`}>
                                    {diagnosisOutcome === "No Fix Needed" && <div className="h-2 w-2 rounded-full bg-blue-500" />}
                                </div>
                                <CheckCircle className={`h-5 w-5 shrink-0 ${diagnosisOutcome === "No Fix Needed" ? "text-blue-600" : "text-muted-foreground"}`} />
                                <div>
                                    <p className="text-sm font-medium">No Fix Needed</p>
                                    <p className="text-xs text-muted-foreground">Asset is in good condition, no repairs required</p>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => handleClose(false)} disabled={isLoading}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={!canSubmit || isLoading}>
                        {isLoading ? "Saving..." : "Submit Inspection"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
