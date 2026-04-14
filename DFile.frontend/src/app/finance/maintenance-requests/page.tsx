"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { StatusText } from "@/components/ui/status-text";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Wrench, CheckCircle2, XCircle, Package, Loader2 } from "lucide-react";
import {
    useFinanceMaintenanceRequests,
    useFinanceMaintenanceSubmissionDetail,
    useFinanceRepairsAwaitingParts,
    useFinanceApproveRepair,
    useFinanceRejectMaintenance,
    useFinanceApproveReplacement,
    useFinanceMarkPartsReady,
} from "@/hooks/use-maintenance";
import { useCategories } from "@/hooks/use-categories";
import { useAddAsset, useAssets } from "@/hooks/use-assets";
import { AddAssetModal } from "@/components/modals/add-asset-modal";
import { MaintenanceDetailsModal } from "@/components/modals/maintenance-details-modal";
import { Asset, CreateAssetPayload, FinanceMaintenanceQueueRow, ReplacementRegistrationContext } from "@/types/asset";

function displayFinanceStatus(r: FinanceMaintenanceQueueRow): string {
    if (r.financeWorkflowStatus) return r.financeWorkflowStatus;
    if (r.status === "Finance Review") return "Pending Approval";
    return r.status;
}

function rowType(r: FinanceMaintenanceQueueRow): string {
    if (r.financeRequestType) return r.financeRequestType;
    if (r.diagnosisOutcome === "Not Repairable" || r.linkedPurchaseOrderId) return "Replacement";
    return "Repair";
}

function buildCreateAssetPayload(asset: Asset, replacementMaintenanceRecordId?: string): CreateAssetPayload {
    const asNullableDate = (v?: string) => (v && v.trim() ? v : undefined);
    return {
        assetName: asset.desc?.trim() || "",
        categoryId: asset.categoryId!,
        lifecycleStatus: asset.lifecycleStatus ?? 0,
        currentCondition: asset.currentCondition ?? 0,
        image: asset.image || undefined,
        manufacturer: asset.manufacturer || undefined,
        model: asset.model || undefined,
        serialNumber: asset.serialNumber || undefined,
        purchaseDate: asNullableDate(asset.purchaseDate),
        vendor: asset.vendor || undefined,
        acquisitionCost: Number(asset.purchasePrice ?? 0),
        usefulLifeYears: Number(asset.usefulLifeYears ?? 0),
        purchasePrice: Number(asset.purchasePrice ?? 0),
        residualValue: null,
        salvagePercentage: asset.salvagePercentage ?? undefined,
        isSalvageOverride: asset.isSalvageOverride ?? false,
        currentBookValue: Number(asset.currentBookValue ?? asset.purchasePrice ?? 0),
        monthlyDepreciation: Number(asset.monthlyDepreciation ?? 0),
        warrantyExpiry: asNullableDate(asset.warrantyExpiry),
        notes: asset.notes || undefined,
        documents: asset.documents || undefined,
        rowVersion: asset.rowVersion || undefined,
        ...(replacementMaintenanceRecordId ? { replacementMaintenanceRecordId } : {}),
    };
}

export default function FinanceMaintenanceRequestsPage() {
    const { user, isLoading: authLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (authLoading || !user) return;
        if (user.role === "Admin") {
            router.replace("/finance/assets");
        }
    }, [authLoading, user, router]);

    const queryClient = useQueryClient();
    const { data: rows = [], isLoading } = useFinanceMaintenanceRequests();
    const { data: awaitingParts = [], isLoading: awaitingLoading } = useFinanceRepairsAwaitingParts();
    const { data: categoriesRaw = [] } = useCategories(false);
    const categories = useMemo(() => categoriesRaw.filter((c) => c.status !== "Archived"), [categoriesRaw]);
    const { data: assetsForSerial = [] } = useAssets(false);
    const addAsset = useAddAsset();

    const approveRepair = useFinanceApproveRepair();
    const rejectReq = useFinanceRejectMaintenance();
    const approveReplacement = useFinanceApproveReplacement();
    const markPartsReady = useFinanceMarkPartsReady();

    const [replacementTarget, setReplacementTarget] = useState<FinanceMaintenanceQueueRow | null>(null);
    const [detailRecord, setDetailRecord] = useState<FinanceMaintenanceQueueRow | null>(null);
    const [detailOpen, setDetailOpen] = useState(false);
    const [rejectionTarget, setRejectionTarget] = useState<FinanceMaintenanceQueueRow | null>(null);
    const {
        data: financeSubmissionDetail,
        isLoading: financeSubmissionLoading,
        isError: financeSubmissionIsError,
    } = useFinanceMaintenanceSubmissionDetail(detailRecord?.id, detailOpen && !!detailRecord);

    const replacementContext: ReplacementRegistrationContext | null = useMemo(() => {
        if (!replacementTarget) return null;
        return {
            maintenanceRecordId: replacementTarget.id,
            requestLabel: replacementTarget.requestId ?? null,
            originalAssetId: replacementTarget.assetId,
            originalAssetName: replacementTarget.assetName ?? null,
            originalAssetCode: replacementTarget.assetCode ?? null,
        };
    }, [replacementTarget]);

    const existingSerialNumbers = useMemo(
        () =>
            assetsForSerial
                .map((a) => (a.serialNumber ?? "").trim())
                .filter((s): s is string => s.length > 0),
        [assetsForSerial],
    );

    const openReplacementModal = (record: FinanceMaintenanceQueueRow) => {
        setReplacementTarget(record);
    };

    const busy =
        approveRepair.isPending ||
        rejectReq.isPending ||
        approveReplacement.isPending ||
        markPartsReady.isPending ||
        addAsset.isPending;

    if (!authLoading && user?.role === "Admin") {
        return (
            <div className="space-y-6">
                <Card className="overflow-hidden p-6">
                    <Skeleton className="h-72 w-full" />
                </Card>
            </div>
        );
    }

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
                                        <TableRow
                                            key={r.id}
                                            className="cursor-pointer hover:bg-muted/50"
                                            onClick={() => {
                                                setDetailRecord(r);
                                                setDetailOpen(true);
                                            }}
                                        >
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
                                            <TableCell className="text-right space-x-2" onClick={(e) => e.stopPropagation()}>
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
                                                            onClick={() => setRejectionTarget(r)}
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
                                                            onClick={() => setRejectionTarget(r)}
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
                                                        onClick={() => openReplacementModal(r)}
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
                                    <TableRow
                                        key={r.id}
                                        className="cursor-pointer hover:bg-muted/50"
                                        onClick={() => {
                                            setDetailRecord(r);
                                            setDetailOpen(true);
                                        }}
                                    >
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
                                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
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

            {detailOpen && detailRecord && (
                <MaintenanceDetailsModal
                    open={detailOpen}
                    onOpenChange={(open) => {
                        setDetailOpen(open);
                        if (!open) setDetailRecord(null);
                    }}
                    record={detailRecord}
                    detailView="financeRequest"
                    financeSubmissionDetail={financeSubmissionDetail ?? null}
                    financeSubmissionLoading={financeSubmissionLoading}
                    financeSubmissionIsError={financeSubmissionIsError}
                />
            )}

            <AddAssetModal
                open={!!replacementTarget}
                onOpenChange={(open) => {
                    if (!open) setReplacementTarget(null);
                }}
                categories={categories}
                existingSerialNumbers={existingSerialNumbers}
                replacementContext={replacementContext}
                onAddAsset={async (asset) => {
                    if (!replacementTarget) return;
                    const payload = buildCreateAssetPayload(asset, replacementTarget.id);
                    await addAsset.mutateAsync(payload);
                    queryClient.invalidateQueries({ queryKey: ["finance-maintenance-requests"] });
                    queryClient.invalidateQueries({ queryKey: ["finance-maintenance-awaiting-parts"] });
                    queryClient.invalidateQueries({ queryKey: ["maintenance"] });
                    setReplacementTarget(null);
                }}
            />

            <ConfirmDialog
                open={rejectionTarget !== null}
                onOpenChange={(open) => {
                    if (!open) setRejectionTarget(null);
                }}
                title="Reject Maintenance Request"
                description={`Are you sure you want to reject this ${rejectionTarget ? rowType(rejectionTarget).toLowerCase() : "request"}? The request will be returned to Maintenance for re-inspection.`}
                confirmLabel="Reject"
                confirmVariant="destructive"
                onConfirm={async () => {
                    if (rejectionTarget) {
                        await rejectReq.mutateAsync({ id: rejectionTarget.id });
                        setRejectionTarget(null);
                    }
                }}
                isLoading={rejectReq.isPending}
            />
        </div>
    );
}
