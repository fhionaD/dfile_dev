"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PackageCheck } from "lucide-react";
import { useMaintenanceRecords } from "@/hooks/use-maintenance";
import { useMaintenanceContext } from "@/contexts/maintenance-context";
import { PartsReadyScheduleModal } from "@/components/modals/parts-ready-schedule-modal";
import { MaintenanceRecord } from "@/types/asset";
import { Button } from "@/components/ui/button";

export default function MaintenancePartsReadyPage() {
    const { enableGlassmorphism } = useMaintenanceContext();
    const { data: records = [], isLoading } = useMaintenanceRecords(false);
    const [selectedRecord, setSelectedRecord] = useState<MaintenanceRecord | null>(null);
    const [scheduleOpen, setScheduleOpen] = useState(false);

    const partsReady = useMemo(
        () =>
            records.filter(
                (r) =>
                    !r.isArchived &&
                    r.status === "In Progress" &&
                    r.financeRequestType === "Repair" &&
                    r.financeWorkflowStatus === "Parts Ready",
            ),
        [records],
    );

    const cardClassName = enableGlassmorphism
        ? "border border-white/20 bg-white/10 dark:bg-black/10 backdrop-blur-xl ring-1 ring-white/10"
        : "";

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                    <PackageCheck className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                    <h1 className="text-xl font-semibold tracking-tight">Repair parts ready</h1>
                    <p className="text-sm text-muted-foreground">
                        Repairs Finance has approved and marked as ready for parts. Set a visit date to move each request to
                        Scheduled (visible on the Schedules page).
                    </p>
                </div>
            </div>

            <Card className={`overflow-hidden ${cardClassName}`}>
                {isLoading ? (
                    <div className="p-6 space-y-2">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                ) : partsReady.length === 0 ? (
                    <p className="p-8 text-sm text-muted-foreground text-center">No repairs waiting with parts ready.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <Table className="table-fixed min-w-[520px]">
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[28%] min-w-[140px]">Request</TableHead>
                                    <TableHead className="w-[52%] min-w-[200px]">Asset</TableHead>
                                    <TableHead className="w-[20%] min-w-[120px] text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {partsReady.map((r) => (
                                    <TableRow key={r.id} className="hover:bg-muted/40">
                                        <TableCell className="font-mono text-xs align-middle py-3">
                                            {r.requestId ?? r.id}
                                        </TableCell>
                                        <TableCell className="align-middle py-3">
                                            <div className="text-sm font-medium leading-snug">{r.assetName ?? r.assetId}</div>
                                            {r.assetCode ? (
                                                <div className="text-xs text-muted-foreground font-mono mt-0.5">{r.assetCode}</div>
                                            ) : null}
                                        </TableCell>
                                        <TableCell className="text-right align-middle py-3">
                                            <Button
                                                type="button"
                                                size="sm"
                                                className="shrink-0"
                                                onClick={() => {
                                                    setSelectedRecord(r);
                                                    setScheduleOpen(true);
                                                }}
                                            >
                                                Schedule
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </Card>

            <PartsReadyScheduleModal
                record={selectedRecord}
                open={scheduleOpen}
                onOpenChange={(open) => {
                    setScheduleOpen(open);
                    if (!open) setSelectedRecord(null);
                }}
                enableGlassmorphism={enableGlassmorphism}
            />
        </div>
    );
}
