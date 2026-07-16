"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, AlertCircle, TrendingUp, Clock } from "lucide-react";
import type { MaintenanceRecord } from "@/types/asset";
import { Skeleton } from "@/components/ui/skeleton";

interface FinanceRepairApprovalModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    maintenanceRecord?: MaintenanceRecord | null;
    assetDetails?: {
        assetName?: string;
        assetCode?: string;
        bookValue?: number;
        usefulLifeYears?: number;
        purchasePrice?: number;
        currentBookValue?: number;
        accumulatedDepreciation?: number;
        monthlyDepreciation?: number;
    };
    isLoading?: boolean;
    onApproveWithDecision?: (payload: ApproveRepairFinancialImpactPayload | ApproveReplacementPayload) => Promise<void>;
}

interface ApproveRepairFinancialImpactPayload {
    maintenanceRecordId: string;
    financeDecision: "Expense" | "IncreaseValue" | "ExtendLife" | "Both";
    adjustmentValue?: number;
    addedLifeMonths?: number;
    maintenanceSpendCost?: number;
}

interface ApproveReplacementPayload {
    maintenanceRecordId: string;
    replacementCost: number;
}

function formatMoneyPhp(n: number | undefined): string {
    if (n == null || Number.isNaN(n)) return "—";
    return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(n);
}

type FinanceDecision = "Expense" | "IncreaseValue" | "ExtendLife" | "Both" | "";

export function FinanceRepairApprovalModal({
    open,
    onOpenChange,
    maintenanceRecord,
    assetDetails,
    isLoading = false,
    onApproveWithDecision,
}: FinanceRepairApprovalModalProps) {
    const [decision, setDecision] = useState<FinanceDecision>("");
    const [adjustmentValue, setAdjustmentValue] = useState<string>("");
    const [addedLifeMonths, setAddedLifeMonths] = useState<string>("");
    const [replacementCost, setReplacementCost] = useState<string>("");
    const [maintenanceSpendCost, setMaintenanceSpendCost] = useState<string>("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isReplacement = maintenanceRecord?.financeRequestType === "Replacement";

    const reset = () => {
        setDecision("");
        setAdjustmentValue("");
        setAddedLifeMonths("");
        setReplacementCost("");
        setMaintenanceSpendCost("");
    };

    const handleClose = (v: boolean) => {
        if (!v) reset();
        onOpenChange(v);
    };

    const canSubmit = (): boolean => {
        if (!maintenanceRecord?.id) return false;

        // For replacement requests: need replacement cost
        if (isReplacement) {
            return replacementCost.trim() !== "" && parseFloat(replacementCost) > 0;
        }

        // For repair requests: need decision and conditional fields
        if (!decision) return false;

        // Validate Expense decision requires maintenance spend cost
        if (decision === "Expense") {
            if (!maintenanceSpendCost || parseFloat(maintenanceSpendCost) <= 0) return false;
        }

        // Validate IncreaseValue and Both decisions require adjustment value
        if (decision === "IncreaseValue" || decision === "Both") {
            if (!adjustmentValue || parseFloat(adjustmentValue) <= 0) return false;
        }

        // Validate ExtendLife and Both decisions require added life months
        if (decision === "ExtendLife" || decision === "Both") {
            if (!addedLifeMonths || parseInt(addedLifeMonths) <= 0) return false;
        }

        return true;
    };

    const handleSubmit = async () => {
        if (!canSubmit() || !maintenanceRecord?.id || !onApproveWithDecision) return;

        setIsSubmitting(true);
        try {
            if (isReplacement) {
                // Replacement workflow: submit replacement cost
                await onApproveWithDecision({
                    maintenanceRecordId: maintenanceRecord.id,
                    replacementCost: parseFloat(replacementCost),
                } as ApproveReplacementPayload);
            } else {
                // Repair workflow: submit financial decision
                await onApproveWithDecision({
                    maintenanceRecordId: maintenanceRecord.id,
                    financeDecision: decision as "Expense" | "IncreaseValue" | "ExtendLife" | "Both",
                    adjustmentValue: decision === "IncreaseValue" || decision === "Both" ? parseFloat(adjustmentValue) : undefined,
                    addedLifeMonths: decision === "ExtendLife" || decision === "Both" ? parseInt(addedLifeMonths) : undefined,
                    maintenanceSpendCost: decision === "Expense" ? parseFloat(maintenanceSpendCost) : undefined,
                } as ApproveRepairFinancialImpactPayload);
            }
            reset();
        } catch {
            // Error handled by caller
        } finally {
            setIsSubmitting(false);
        }
    };

    const repairType = maintenanceRecord?.repairType;
    const estimatedCost = maintenanceRecord?.cost;
    const repairDescription = maintenanceRecord?.quotationNotes;

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-h-[90vh] max-w-2xl w-[95vw] p-0 overflow-hidden flex flex-col">
                <DialogHeader className="p-6 bg-muted/40 border-b border-border shrink-0">
                    <DialogTitle className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-primary" />
                        {isReplacement ? "Approve Asset Replacement" : "Approve Repair Financial Impact"}
                    </DialogTitle>
                    <DialogDescription>
                        {isReplacement
                            ? "Enter the replacement cost for the new asset. This will be recorded as Procurement Spend."
                            : repairType === "Minor"
                            ? "Review and approve the minor repair. Typically no depreciation changes needed."
                            : "Review and approve the repair financial impact. Choose how depreciation will be adjusted."}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto">
                    <div className="space-y-4 p-6">
                        {/* Asset Details Panel */}
                        {isLoading ? (
                            <Skeleton className="h-40 w-full" />
                        ) : (
                            <div className="rounded-lg border bg-muted/20 p-4">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Asset Details</p>
                                <dl className="grid grid-cols-2 gap-3 text-sm">
                                    <div>
                                        <dt className="text-xs text-muted-foreground">Asset</dt>
                                        <dd className="font-medium">{assetDetails?.assetName || "—"}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs text-muted-foreground">Code</dt>
                                        <dd className="font-mono text-xs">{assetDetails?.assetCode || "—"}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs text-muted-foreground">Book Value</dt>
                                        <dd className="font-mono">{formatMoneyPhp(assetDetails?.bookValue || assetDetails?.currentBookValue)}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs text-muted-foreground">Accumulated Depreciation</dt>
                                        <dd className="font-mono">{formatMoneyPhp(assetDetails?.accumulatedDepreciation)}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs text-muted-foreground">Useful Life</dt>
                                        <dd>{assetDetails?.usefulLifeYears || 0} years</dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs text-muted-foreground">Monthly Depreciation</dt>
                                        <dd className="font-mono">{formatMoneyPhp(assetDetails?.monthlyDepreciation)}</dd>
                                    </div>
                                </dl>
                            </div>
                        )}

                        {/* Maintenance/Repair Details */}
                        {maintenanceRecord && (
                            <div className="rounded-lg border bg-muted/20 p-4">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Repair Details</p>
                                <dl className="space-y-2 text-sm">
                                    <div>
                                        <dt className="text-xs text-muted-foreground">Repair Type</dt>
                                        <dd className="font-medium capitalize">{repairType || "—"}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs text-muted-foreground">Estimated Cost</dt>
                                        <dd className="font-mono">{formatMoneyPhp(estimatedCost)}</dd>
                                    </div>
                                    {repairDescription && (
                                        <div>
                                            <dt className="text-xs text-muted-foreground">Description</dt>
                                            <dd className="text-foreground/90 whitespace-pre-wrap text-xs">{repairDescription}</dd>
                                        </div>
                                    )}
                                </dl>
                            </div>
                        )}

                        {/* Finance Decision Options - For Repairs Only */}
                        {!isReplacement && (
                        <div className="space-y-3 border-t pt-4">
                            <Label className="text-sm">Financial Impact Decision</Label>
                            <div className="space-y-2">
                                {/* Expense Only */}
                                <button
                                    type="button"
                                    onClick={() => setDecision("Expense")}
                                    className={`w-full flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors text-left text-sm ${
                                        decision === "Expense"
                                            ? "border-green-500 bg-green-50 dark:bg-green-950/30 ring-1 ring-green-500"
                                            : "border-border hover:bg-muted/50"
                                    }`}
                                >
                                    <AlertCircle
                                        className={`h-5 w-5 shrink-0 mt-0.5 ${
                                            decision === "Expense" ? "text-green-600" : "text-muted-foreground"
                                        }`}
                                    />
                                    <div className="flex-1">
                                        <p className="font-medium">Treat as Expense</p>
                                        <p className="text-xs text-muted-foreground">No changes to asset value or useful life</p>
                                    </div>
                                </button>

                                {/* Increase Value Only */}
                                <button
                                    type="button"
                                    onClick={() => setDecision("IncreaseValue")}
                                    className={`w-full flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors text-left text-sm ${
                                        decision === "IncreaseValue"
                                            ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30 ring-1 ring-blue-500"
                                            : "border-border hover:bg-muted/50"
                                    }`}
                                >
                                    <TrendingUp
                                        className={`h-5 w-5 shrink-0 mt-0.5 ${
                                            decision === "IncreaseValue" ? "text-blue-600" : "text-muted-foreground"
                                        }`}
                                    />
                                    <div className="flex-1">
                                        <p className="font-medium">Increase Asset Value</p>
                                        <p className="text-xs text-muted-foreground">Asset cost increases; useful life unchanged</p>
                                    </div>
                                </button>

                                {/* Extend Life Only */}
                                <button
                                    type="button"
                                    onClick={() => setDecision("ExtendLife")}
                                    className={`w-full flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors text-left text-sm ${
                                        decision === "ExtendLife"
                                            ? "border-purple-500 bg-purple-50 dark:bg-purple-950/30 ring-1 ring-purple-500"
                                            : "border-border hover:bg-muted/50"
                                    }`}
                                >
                                    <Clock
                                        className={`h-5 w-5 shrink-0 mt-0.5 ${
                                            decision === "ExtendLife" ? "text-purple-600" : "text-muted-foreground"
                                        }`}
                                    />
                                    <div className="flex-1">
                                        <p className="font-medium">Extend Useful Life</p>
                                        <p className="text-xs text-muted-foreground">Asset cost unchanged; useful life increases</p>
                                    </div>
                                </button>

                                {/* Both */}
                                <button
                                    type="button"
                                    onClick={() => setDecision("Both")}
                                    className={`w-full flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors text-left text-sm ${
                                        decision === "Both"
                                            ? "border-orange-500 bg-orange-50 dark:bg-orange-950/30 ring-1 ring-orange-500"
                                            : "border-border hover:bg-muted/50"
                                    }`}
                                >
                                    <div className="h-5 w-5 shrink-0 mt-0.5 flex items-center justify-center">
                                        <div
                                            className={`h-4 w-4 rounded-full ${
                                                decision === "Both" ? "bg-orange-600" : "border border-muted-foreground"
                                            }`}
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-medium">Both: Increase Value & Extend Life</p>
                                        <p className="text-xs text-muted-foreground">Asset cost and useful life both increase</p>
                                    </div>
                                </button>
                            </div>
                        </div>
                        )}

                        {/* Replacement Cost Input - For Replacements Only */}
                        {isReplacement && (
                            <div className="space-y-3 border-t pt-4">
                                <Label htmlFor="replacement-cost" className="text-sm">Replacement Asset Cost (PHP)</Label>
                                <Input
                                    id="replacement-cost"
                                    type="number"
                                    min={0}
                                    step="1"
                                    value={replacementCost}
                                    onChange={(e) => setReplacementCost(e.target.value)}
                                    placeholder="Enter the cost of the replacement asset"
                                    className="h-10"
                                />
                                <p className="text-xs text-muted-foreground">This amount will be recorded as Procurement Spend and used as the purchase price for the new asset.</p>
                            </div>
                        )}

                        {/* Conditional Input Fields */}
                        {!isReplacement && (
                            <>
                                {/* Maintenance Spend Cost - For Expense Only */}
                                {decision === "Expense" && (
                                    <div className="space-y-2">
                                        <Label htmlFor="maintenance-spend-cost" className="text-sm">
                                            Actual Maintenance Spend Cost (PHP)
                                        </Label>
                                        <Input
                                            id="maintenance-spend-cost"
                                            type="number"
                                            min={0}
                                            step="1"
                                            value={maintenanceSpendCost}
                                            onChange={(e) => setMaintenanceSpendCost(e.target.value)}
                                            placeholder={`e.g., ${formatMoneyPhp(estimatedCost || 0)}`}
                                            className="h-10"
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            This amount will be recorded as Maintenance Spend and included in KPI reports. No changes to asset value or useful life.
                                        </p>
                                    </div>
                                )}

                                {/* Amount to Increase Asset Value - For IncreaseValue or Both */}
                                {(decision === "IncreaseValue" || decision === "Both") && (
                                    <div className="space-y-2">
                                        <Label htmlFor="adjustment-value" className="text-sm">
                                            Amount to Increase Asset Value (PHP)
                                        </Label>
                                        <Input
                                            id="adjustment-value"
                                            type="number"
                                            min={0}
                                            step="1"
                                            value={adjustmentValue}
                                            onChange={(e) => setAdjustmentValue(e.target.value)}
                                            placeholder={`e.g., ${formatMoneyPhp(estimatedCost || 0)}`}
                                            className="h-10"
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Default: use estimated repair cost ({formatMoneyPhp(estimatedCost)})
                                        </p>
                                    </div>
                                )}

                                {/* Additional Useful Life - For ExtendLife or Both */}
                                {(decision === "ExtendLife" || decision === "Both") && (
                                    <div className="space-y-2">
                                        <Label htmlFor="added-life-months" className="text-sm">
                                            Additional Useful Life (months)
                                        </Label>
                                        <Input
                                            id="added-life-months"
                                            type="number"
                                            min={1}
                                            step="1"
                                            value={addedLifeMonths}
                                            onChange={(e) => setAddedLifeMonths(e.target.value)}
                                            placeholder="e.g., 12 (for 1 year)"
                                            className="h-10"
                                        />
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>

                <DialogFooter className="border-t bg-muted/40 p-6 flex gap-2 shrink-0">
                    <Button variant="outline" onClick={() => handleClose(false)}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={!canSubmit() || isSubmitting}
                        className="gap-2"
                    >
                        {isSubmitting ? "Processing..." : (isReplacement ? "Approve Replacement" : "Apply Decision")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
