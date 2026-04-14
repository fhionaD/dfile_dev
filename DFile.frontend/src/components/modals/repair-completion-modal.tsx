"use client";

import { useEffect, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { MaintenanceRecord } from "@/types/asset";
import { useCompleteRepair } from "@/hooks/use-maintenance";

export type RepairCompletionModalProps = {
    record: MaintenanceRecord | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    enableGlassmorphism?: boolean;
};

export function RepairCompletionModal({
    record,
    open,
    onOpenChange,
    enableGlassmorphism = false,
}: RepairCompletionModalProps) {
    const completeRepair = useCompleteRepair();
    const [notes, setNotes] = useState("");

    useEffect(() => {
        if (!open) setNotes("");
    }, [open, record?.id]);

    const handleSubmit = async () => {
        if (!record || !notes.trim()) return;
        await completeRepair.mutateAsync({ id: record.id, repairDescription: notes.trim() });
        onOpenChange(false);
    };

    const cardShell = enableGlassmorphism
        ? "border border-white/20 bg-white/10 dark:bg-black/10 backdrop-blur-2xl ring-1 ring-white/10"
        : "";

    if (!record) return null;

    const assetLabel = record.assetName || record.assetCode || record.assetId;
    const reqLabel = record.requestId ?? record.id;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className={`sm:max-w-lg rounded-2xl ${cardShell}`}>
                <DialogHeader>
                    <DialogTitle className="text-lg">Complete repair</DialogTitle>
                    <DialogDescription className="text-sm">
                        Request <span className="font-mono text-xs">{reqLabel}</span> — record what was done on site. This
                        closes the ticket and saves repair history on the asset.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                    <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">
                        <p className="font-medium text-foreground">{assetLabel}</p>
                        {record.roomCode || record.roomName ? (
                            <p className="text-xs text-muted-foreground mt-0.5">
                                {[record.roomCode, record.roomName].filter(Boolean).join(" · ")}
                            </p>
                        ) : null}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="repair-completion-notes">Repair description</Label>
                        <Textarea
                            id="repair-completion-notes"
                            rows={5}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Describe the repair performed, parts replaced, tests run…"
                        />
                    </div>
                </div>
                <DialogFooter className="gap-2 sm:gap-0">
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        onClick={() => void handleSubmit()}
                        disabled={!notes.trim() || completeRepair.isPending}
                    >
                        {completeRepair.isPending ? "Saving…" : "Complete"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
