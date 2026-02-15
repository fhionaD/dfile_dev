"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Wrench, Calendar, AlertTriangle, Package, RefreshCw } from "lucide-react";
import { MaintenanceRecord } from "@/types/asset";

interface MaintenanceDetailsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    record: MaintenanceRecord | null;
    assetName?: string;
    onEdit?: () => void;
    onRequestReplacement?: (assetId: string) => void;
}

const statusColor: Record<string, string> = {
    "Pending": "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    "In Progress": "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400",
    "Completed": "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
};

const priorityColor: Record<string, string> = {
    Low: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
    Medium: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    High: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

export function MaintenanceDetailsModal({ open, onOpenChange, record, assetName, onEdit, onRequestReplacement }: MaintenanceDetailsModalProps) {
    if (!record) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg rounded-2xl border-border p-0 overflow-hidden flex flex-col max-h-[85vh]">
                <DialogHeader className="p-6 bg-muted/40 border-b border-border shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                            <Wrench size={24} />
                        </div>
                        <div>
                            <DialogTitle className="text-lg font-semibold text-foreground">Maintenance Request</DialogTitle>
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                <Badge variant="secondary" className="font-mono text-xs">{record.id}</Badge>
                                <Badge className={`text-xs ${statusColor[record.status] || ""}`}>{record.status}</Badge>
                                <Badge className={`text-xs ${priorityColor[record.priority] || ""}`}>{record.priority} Priority</Badge>
                            </div>
                        </div>
                    </div>
                    <DialogDescription className="sr-only">Maintenance record details</DialogDescription>
                </DialogHeader>

                <div className="p-6 space-y-5 flex-1 overflow-y-auto">
                    {/* Description */}
                    <div>
                        <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                            <AlertTriangle size={16} className="text-primary" /> Issue Description
                        </h4>
                        <p className="text-sm text-foreground bg-muted/10 p-4 rounded-xl border border-border/50 leading-relaxed">
                            {record.description}
                        </p>
                    </div>

                    <Separator />

                    {/* Asset & Type */}
                    <div>
                        <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                            <Package size={16} className="text-primary" /> Asset Information
                        </h4>
                        <div className="grid grid-cols-2 gap-4 text-sm bg-muted/10 p-4 rounded-xl border border-border/50">
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

                    {/* Dates */}
                    <div>
                        <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                            <Calendar size={16} className="text-primary" /> Timeline
                        </h4>
                        <div className="grid grid-cols-2 gap-4 text-sm bg-muted/10 p-4 rounded-xl border border-border/50">
                            <div>
                                <p className="text-xs text-muted-foreground">Date Reported</p>
                                <p className="font-medium">{record.dateReported}</p>
                            </div>
                            {record.startDate && (
                                <div>
                                    <p className="text-xs text-muted-foreground">Start Date</p>
                                    <p className="font-medium">{record.startDate}</p>
                                </div>
                            )}
                            {record.endDate && (
                                <div>
                                    <p className="text-xs text-muted-foreground">End Date</p>
                                    <p className="font-medium">{record.endDate}</p>
                                </div>
                            )}
                            {record.cost !== undefined && (
                                <div>
                                    <p className="text-xs text-muted-foreground">Cost</p>
                                    <p className="font-semibold">${record.cost.toLocaleString()}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <DialogFooter className="p-6 bg-muted/40 border-t border-border flex flex-col sm:flex-row gap-2 sm:justify-between items-center bg-card shrink-0">
                    <div className="flex gap-2 w-full sm:w-auto">
                        {onEdit && (
                            <Button variant="outline" onClick={onEdit} className="rounded-xl flex-1 sm:flex-none">
                                <Wrench size={16} className="mr-2" /> Edit Request
                            </Button>
                        )}
                        {onRequestReplacement && (
                            <Button variant="destructive" onClick={() => onRequestReplacement(record.assetId)} className="rounded-xl flex-1 sm:flex-none bg-red-100 text-red-700 hover:bg-red-200 border-red-200">
                                <Package size={16} className="mr-2" /> Request Replacement
                            </Button>
                        )}
                    </div>
                    <Button variant="default" onClick={() => onOpenChange(false)} className="rounded-xl w-full sm:w-auto mt-2 sm:mt-0">
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
