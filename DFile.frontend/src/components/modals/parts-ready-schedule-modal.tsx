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
import { Input } from "@/components/ui/input";
import type { MaintenanceRecord } from "@/types/asset";
import { useUpdateMaintenanceRecord, type UpdateMaintenancePayload } from "@/hooks/use-maintenance";

function buildUpdatePayload(record: MaintenanceRecord, scheduledDate: string): UpdateMaintenancePayload {
    return {
        assetId: record.assetId,
        roomId: record.roomId,
        description: (record.description ?? "").trim(),
        status: "Scheduled",
        priority: record.priority,
        type: record.type,
        frequency: record.frequency?.trim() || "One-time",
        startDate: scheduledDate,
        endDate: record.endDate,
        cost: record.cost,
        dateReported: record.dateReported,
        diagnosisOutcome: record.diagnosisOutcome ?? undefined,
        inspectionNotes: record.inspectionNotes,
        quotationNotes: record.quotationNotes,
        attachments: record.attachments,
    };
}

export type PartsReadyScheduleModalProps = {
    record: MaintenanceRecord | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    enableGlassmorphism?: boolean;
};

export function PartsReadyScheduleModal({
    record,
    open,
    onOpenChange,
    enableGlassmorphism = false,
}: PartsReadyScheduleModalProps) {
    const updateRecord = useUpdateMaintenanceRecord();
    const [scheduledDate, setScheduledDate] = useState("");

    useEffect(() => {
        if (!open || !record) return;
        const base = record.startDate?.trim() || new Date().toISOString().split("T")[0];
        setScheduledDate(base.slice(0, 10));
    }, [open, record]);

    const handleSubmit = async () => {
        if (!record || !scheduledDate.trim()) return;
        await updateRecord.mutateAsync({
            id: record.id,
            payload: buildUpdatePayload(record, scheduledDate.trim()),
        });
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
            <DialogContent className={`sm:max-w-md rounded-2xl ${cardShell}`}>
                <DialogHeader>
                    <DialogTitle className="text-lg">Schedule repair visit</DialogTitle>
                    <DialogDescription className="text-sm">
                        Parts are ready for request <span className="font-mono text-xs">{reqLabel}</span>. Set the date
                        maintenance will perform the work. The request moves to <strong>Scheduled</strong> and appears in
                        Schedules.
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
                        <Label htmlFor="parts-ready-schedule-date">Scheduled date</Label>
                        <Input
                            id="parts-ready-schedule-date"
                            type="date"
                            value={scheduledDate}
                            onChange={(e) => setScheduledDate(e.target.value)}
                        />
                    </div>
                </div>
                <DialogFooter className="gap-2 sm:gap-0">
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button type="button" onClick={() => void handleSubmit()} disabled={!scheduledDate || updateRecord.isPending}>
                        {updateRecord.isPending ? "Saving…" : "Create schedule"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
