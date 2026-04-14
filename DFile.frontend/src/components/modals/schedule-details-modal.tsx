"use client";

import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { StatusText } from "@/components/ui/status-text";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarClock, MapPin, RefreshCw } from "lucide-react";
import { MaintenanceRecord } from "@/types/asset";
import { useMaintenanceScheduleSummary } from "@/hooks/use-maintenance";

export interface ScheduleDetailsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    record: MaintenanceRecord | null;
    /** For recurring / expanded occurrences: date shown as the scheduled occurrence. */
    scheduledDateOverride?: string | null;
    /** e.g. "#2/12" when part of a series. */
    occurrenceLabel?: string | null;
    enableGlassmorphism?: boolean;
    /** Opens the full maintenance execution / workflow modal for the same record. */
    onOpenWorkflowDetails?: (record: MaintenanceRecord) => void;
}

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

const priorityVariant: Record<string, "danger" | "warning" | "info" | "muted"> = {
    High: "danger",
    Medium: "warning",
    Low: "info",
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="grid grid-cols-[minmax(8rem,35%)_1fr] gap-x-3 gap-y-1 py-2 border-b border-border/60 last:border-0">
            <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</dt>
            <dd className="text-sm text-foreground">{children}</dd>
        </div>
    );
}

export function ScheduleDetailsModal({
    open,
    onOpenChange,
    record,
    scheduledDateOverride,
    occurrenceLabel,
    enableGlassmorphism = false,
    onOpenWorkflowDetails,
}: ScheduleDetailsModalProps) {
    const recordId = record?.id ?? "";
    const { data: scheduleSummary, isLoading: scheduleSummaryLoading } = useMaintenanceScheduleSummary(recordId, open && !!record);

    if (!record) return null;

    const scheduledRaw = scheduledDateOverride ?? scheduleSummary?.startDate ?? record.startDate;
    const scheduledDisplay = scheduledRaw ? new Date(scheduledRaw).toLocaleDateString() : "—";

    const requestRef = scheduleSummary?.requestId ?? record.requestId ?? record.id;
    const assetName = scheduleSummary?.assetName ?? record.assetName;
    const assetCode = scheduleSummary?.assetCode ?? record.assetCode;
    const roomCode = scheduleSummary?.roomCode ?? record.roomCode;
    const roomName = scheduleSummary?.roomName ?? record.roomName;
    const type = scheduleSummary?.type ?? record.type;
    const priority = scheduleSummary?.priority ?? record.priority;
    const frequency = scheduleSummary?.frequency ?? record.frequency;
    const status = scheduleSummary?.status ?? record.status;

    const cardClass = enableGlassmorphism
        ? "border border-white/20 bg-white/10 dark:bg-black/10 backdrop-blur-xl ring-1 ring-white/10"
        : "";

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className={`max-w-lg ${cardClass}`}>
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                            <CalendarClock className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                            <DialogTitle className="text-lg">Schedule details</DialogTitle>
                            <DialogDescription className="text-xs mt-0.5">
                                Planned maintenance — not the full work order, costs, or attachments.
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="py-2">
                    {scheduleSummaryLoading ? (
                        <div className="space-y-3 py-1">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                    ) : (
                        <dl>
                            <Row label="Request">
                                <span className="font-mono text-xs">{requestRef}</span>
                                {occurrenceLabel ? (
                                    <span className="ml-2 text-xs text-muted-foreground">{occurrenceLabel}</span>
                                ) : null}
                            </Row>
                            <Row label="Asset">
                                <div>
                                    <div className="font-medium">{assetName || record.assetId}</div>
                                    {assetCode ? (
                                        <div className="text-xs text-muted-foreground font-mono mt-0.5">{assetCode}</div>
                                    ) : null}
                                </div>
                            </Row>
                            <Row label="Location">
                                {roomCode || roomName ? (
                                    <div className="flex items-start gap-1.5">
                                        <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                                        <div>
                                            <div>{roomCode ?? roomName}</div>
                                            {roomName && roomCode ? (
                                                <div className="text-xs text-muted-foreground">{roomName}</div>
                                            ) : null}
                                        </div>
                                    </div>
                                ) : (
                                    <span className="text-muted-foreground">—</span>
                                )}
                            </Row>
                            <Row label="Schedule type">
                                <span>{type}</span>
                            </Row>
                            <Row label="Priority">
                                <StatusText variant={priorityVariant[priority] ?? "muted"}>{priority}</StatusText>
                            </Row>
                            <Row label="Frequency">
                                <div className="flex items-center gap-1.5">
                                    <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span>{frequency ?? "One-time"}</span>
                                </div>
                            </Row>
                            <Row label="Scheduled date">
                                <span className="tabular-nums">{scheduledDisplay}</span>
                            </Row>
                            <Row label="Status">
                                <StatusText variant={statusVariant[status] ?? "muted"}>{status}</StatusText>
                            </Row>
                        </dl>
                    )}
                </div>

                <DialogFooter className="flex-col sm:flex-row gap-2 sm:justify-between sm:items-center">
                    {onOpenWorkflowDetails ? (
                        <Button
                            type="button"
                            variant="secondary"
                            className="w-full sm:w-auto"
                            onClick={() => onOpenWorkflowDetails(record)}
                        >
                            Open workflow details
                        </Button>
                    ) : (
                        <span />
                    )}
                    <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => onOpenChange(false)}>
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
