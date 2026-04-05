"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { StatusText } from "@/components/ui/status-text";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wrench, CheckCircle2, XCircle, Package, Loader2 } from "lucide-react";
import {
    useFinanceMaintenanceRequests,
    useFinanceRepairsAwaitingParts,
    useFinanceApproveRepair,
    useFinanceRejectMaintenance,
    useFinanceApproveReplacement,
    useFinanceCompleteReplacement,
    useFinanceMarkPartsReady,
    type CompleteReplacementPayload,
} from "@/hooks/use-maintenance";
import { useCategories } from "@/hooks/use-categories";
import { MaintenanceRecord } from "@/types/asset";

function displayFinanceStatus(r: MaintenanceRecord): string {
    if (r.financeWorkflowStatus) return r.financeWorkflowStatus;
    if (r.status === "Finance Review") return "Pending Approval";
    return r.status;
}

function rowType(r: MaintenanceRecord): string {
    if (r.financeRequestType) return r.financeRequestType;
    if (r.diagnosisOutcome === "Not Repairable" || r.linkedPurchaseOrderId) return "Replacement";
    return "Repair";
}

export default function FinanceMaintenanceRequestsPage() {
    const { data: rows = [], isLoading } = useFinanceMaintenanceRequests();
    const { data: awaitingParts = [], isLoading: awaitingLoading } = useFinanceRepairsAwaitingParts();
    const { data: categoriesRaw = [] } = useCategories(false);
    const categories = useMemo(() => categoriesRaw.filter((c) => c.status !== "Archived"), [categoriesRaw]);

    const approveRepair = useFinanceApproveRepair();
    const rejectReq = useFinanceRejectMaintenance();
    const approveReplacement = useFinanceApproveReplacement();
    const completeReplacement = useFinanceCompleteReplacement();
    const markPartsReady = useFinanceMarkPartsReady();

    const [completeOpen, setCompleteOpen] = useState(false);
    const [completeId, setCompleteId] = useState<string | null>(null);
    const [form, setForm] = useState<CompleteReplacementPayload>({
        assetName: "",
        categoryId: "",
        serialNumber: "",
        cost: 0,
        dateOfAcquisition: "",
        documentation: "",
    });

    const openComplete = (id: string) => {
        setCompleteId(id);
        setForm({
            assetName: "",
            categoryId: categories[0]?.id ?? "",
            serialNumber: "",
            cost: 0,
            dateOfAcquisition: new Date().toISOString().split("T")[0],
            documentation: "",
        });
        setCompleteOpen(true);
    };

    const busy =
        approveRepair.isPending ||
        rejectReq.isPending ||
        approveReplacement.isPending ||
        completeReplacement.isPending ||
        markPartsReady.isPending;

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Wrench className="h-5 w-5 text-primary" />
                </div>
                <div>
                    <h1 className="text-xl font-semibold tracking-tight">Maintenance Requests</h1>
                    <p className="text-sm text-muted-foreground">
                        Repair and replacement approvals from Maintenance, plus replacement asset registration.
                    </p>
                </div>
            </div>

            <Card className="overflow-hidden">
                <div className="p-4 border-b border-border flex items-center justify-between">
                    <p className="text-sm font-medium">Queue</p>
                    {busy && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                </div>
                {isLoading ? (
                    <div className="p-6 space-y-2">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                ) : rows.length === 0 ? (
                    <p className="p-8 text-sm text-muted-foreground text-center">No maintenance finance items.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Request</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Asset</TableHead>
                                    <TableHead>Finance status</TableHead>
                                    <TableHead>Maintenance status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {rows.map((r) => {
                                    const fin = displayFinanceStatus(r);
                                    const pending = fin === "Pending Approval";
                                    const waiting = r.status === "Waiting for Replacement" && fin === "Waiting for Replacement";
                                    const isRepair = rowType(r) === "Repair";

                                    return (
                                        <TableRow key={r.id}>
                                            <TableCell className="font-mono text-xs">{r.requestId ?? r.id}</TableCell>
                                            <TableCell>{rowType(r)}</TableCell>
                                            <TableCell>
                                                <div className="text-sm font-medium">{r.assetName ?? r.assetId}</div>
                                                {r.assetCode && <div className="text-xs text-muted-foreground font-mono">{r.assetCode}</div>}
                                            </TableCell>
                                            <TableCell>
                                                <StatusText variant="warning">{fin}</StatusText>
                                            </TableCell>
                                            <TableCell>
                                                <StatusText variant="muted">{r.status}</StatusText>
                                            </TableCell>
                                            <TableCell className="text-right space-x-2">
                                                {pending && isRepair && (
                                                    <>
                                                        <Button
                                                            size="sm"
                                                            className="gap-1"
                                                            onClick={() => approveRepair.mutate(r.id)}
                                                            disabled={busy}
                                                        >
                                                            <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="gap-1"
                                                            onClick={() => rejectReq.mutate({ id: r.id })}
                                                            disabled={busy}
                                                        >
                                                            <XCircle className="h-3.5 w-3.5" /> Reject
                                                        </Button>
                                                    </>
                                                )}
                                                {pending && !isRepair && (
                                                    <>
                                                        <Button
                                                            size="sm"
                                                            className="gap-1"
                                                            onClick={() => approveReplacement.mutate(r.id)}
                                                            disabled={busy}
                                                        >
                                                            <CheckCircle2 className="h-3.5 w-3.5" /> Approve replacement
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="gap-1"
                                                            onClick={() => rejectReq.mutate({ id: r.id })}
                                                            disabled={busy}
                                                        >
                                                            <XCircle className="h-3.5 w-3.5" /> Reject
                                                        </Button>
                                                    </>
                                                )}
                                                {waiting && (
                                                    <Button
                                                        size="sm"
                                                        variant="secondary"
                                                        className="gap-1"
                                                        onClick={() => openComplete(r.id)}
                                                        disabled={busy}
                                                    >
                                                        <Package className="h-3.5 w-3.5" /> Register replacement asset
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </Card>

            <Card className="overflow-hidden">
                <div className="p-4 border-b border-border flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium">Repairs awaiting parts</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            After approving a repair, mark parts ready here to notify Maintenance.
                        </p>
                    </div>
                    {busy && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                </div>
                {awaitingLoading ? (
                    <div className="p-6 space-y-2">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                ) : awaitingParts.length === 0 ? (
                    <p className="p-8 text-sm text-muted-foreground text-center">No approved repairs waiting for parts.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Request</TableHead>
                                    <TableHead>Asset</TableHead>
                                    <TableHead>Est. cost</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {awaitingParts.map((r) => (
                                    <TableRow key={r.id}>
                                        <TableCell className="font-mono text-xs">{r.requestId ?? r.id}</TableCell>
                                        <TableCell>
                                            <div className="text-sm font-medium">{r.assetName ?? r.assetId}</div>
                                            {r.assetCode && (
                                                <div className="text-xs text-muted-foreground font-mono">{r.assetCode}</div>
                                            )}
                                        </TableCell>
                                        <TableCell className="tabular-nums text-sm">
                                            {r.cost != null ? `₱${Number(r.cost).toFixed(2)}` : "—"}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                size="sm"
                                                className="gap-1"
                                                onClick={() => markPartsReady.mutate(r.id)}
                                                disabled={busy}
                                            >
                                                <CheckCircle2 className="h-3.5 w-3.5" /> Parts ready
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </Card>

            <Dialog open={completeOpen} onOpenChange={setCompleteOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Register replacement asset</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <div className="space-y-1">
                            <Label>Asset name</Label>
                            <Input value={form.assetName} onChange={(e) => setForm({ ...form, assetName: e.target.value })} />
                        </div>
                        <div className="space-y-1">
                            <Label>Category</Label>
                            <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v })}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Category" />
                                </SelectTrigger>
                                <SelectContent>
                                    {categories.map((c) => (
                                        <SelectItem key={c.id} value={c.id}>
                                            {c.categoryName}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label>Serial number</Label>
                            <Input value={form.serialNumber} onChange={(e) => setForm({ ...form, serialNumber: e.target.value })} />
                        </div>
                        <div className="space-y-1">
                            <Label>Cost</Label>
                            <Input
                                type="number"
                                min={0}
                                step="0.01"
                                value={form.cost || ""}
                                onChange={(e) => setForm({ ...form, cost: parseFloat(e.target.value) || 0 })}
                            />
                        </div>
                        <div className="space-y-1">
                            <Label>Date of acquisition</Label>
                            <Input
                                type="date"
                                value={form.dateOfAcquisition}
                                onChange={(e) => setForm({ ...form, dateOfAcquisition: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1">
                            <Label>Documentation (URLs or notes)</Label>
                            <Input value={form.documentation} onChange={(e) => setForm({ ...form, documentation: e.target.value })} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCompleteOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            disabled={!completeId || !form.assetName.trim() || !form.categoryId || form.cost <= 0 || completeReplacement.isPending}
                            onClick={async () => {
                                if (!completeId) return;
                                await completeReplacement.mutateAsync({ id: completeId, payload: form });
                                setCompleteOpen(false);
                                setCompleteId(null);
                            }}
                        >
                            Submit
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
