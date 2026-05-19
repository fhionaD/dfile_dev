"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import api, { getErrorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import { CreditCard, Loader2, Check, Clock, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface BillingPlanOption {
    plan: number;
    code: string;
    displayName: string;
    pricePesos: number;
    amountCents: number;
    yearlyPricePesos: number;
    yearlyAmountCents: number;
    summary: string;
    isFreePlan: boolean;
}

interface SubscriptionStatus {
    id: number;
    planName: string;
    billingCycle: string;
    startDate: string;
    endDate: string;
    status: string;
    daysUntilExpiry: number;
}

interface BillingPlansResponse {
    currentPlanCode: string;
    currentPlan: number;
    hasUsedFreePlan: boolean;
    currentSubscription: SubscriptionStatus | null;
    plans: BillingPlanOption[];
}

type BillingCycle = "Monthly" | "Yearly";

export default function TenantBillingPage() {
    const { user, isLoading } = useAuth();
    const router = useRouter();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [plansLoading, setPlansLoading] = useState(true);
    const [plansError, setPlansError] = useState<string | null>(null);
    const [billing, setBilling] = useState<BillingPlansResponse | null>(null);
    const [selectedPlanCode, setSelectedPlanCode] = useState<string | null>(null);
    const [billingCycle, setBillingCycle] = useState<BillingCycle>("Monthly");

    useEffect(() => {
        if (isLoading || !user) return;
        if (user.role !== "Admin") {
            router.replace("/forbidden");
        }
    }, [isLoading, user, router]);

    const loadPlans = () => {
        if (isLoading || !user || user.role !== "Admin") return;
        let cancelled = false;
        (async () => {
            setPlansLoading(true);
            setPlansError(null);
            try {
                const { data } = await api.get<BillingPlansResponse>("/api/Payments/billing/plans");
                if (cancelled) return;
                setBilling(data);
                setSelectedPlanCode(data.currentPlanCode !== "None" ? data.currentPlanCode : null);
            } catch (e: unknown) {
                if (!cancelled) setPlansError(getErrorMessage(e, "Could not load subscription plans."));
            } finally {
                if (!cancelled) setPlansLoading(false);
            }
        })();
        return () => { cancelled = true; };
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(loadPlans, [isLoading, user]);

    const activateFreePlan = async () => {
        setError(null);
        setBusy(true);
        try {
            await api.post("/api/Payments/free-plan/activate");
            toast.success("Free plan activated successfully.");
            loadPlans();
        } catch (e: unknown) {
            setError(getErrorMessage(e, "Could not activate free plan."));
        } finally {
            setBusy(false);
        }
    };

    const startCheckout = async () => {
        if (!selectedPlanCode || !billing) return;

        const plan = billing.plans.find(p => p.code === selectedPlanCode);
        if (!plan) return;

        // Free plan — use dedicated activation endpoint, not PayMongo
        if (plan.isFreePlan) {
            await activateFreePlan();
            return;
        }

        setError(null);
        setBusy(true);
        try {
            const { data } = await api.post<{ paymentId: string; checkoutUrl: string }>(
                "/api/Payments/paymongo/checkout",
                { planCode: selectedPlanCode, billingCycle }
            );
            if (data.checkoutUrl) {
                window.location.href = data.checkoutUrl;
                return;
            }
            setError("No checkout URL returned.");
        } catch (e: unknown) {
            setError(getErrorMessage(e, "Could not start checkout."));
        } finally {
            setBusy(false);
        }
    };

    const isCheckoutDisabled = (plan: BillingPlanOption): boolean => {
        if (plan.isFreePlan && billing?.hasUsedFreePlan) return true;
        if (plan.code === billing?.currentPlanCode && billing?.currentSubscription?.status !== "Expired") return true;
        return false;
    };

    if (isLoading || !user) return null;
    if (user.role !== "Admin") return null;

    const sub = billing?.currentSubscription;
    const expiryWarning = sub && sub.daysUntilExpiry <= 7 && sub.status !== "Expired";
    const isExpired = sub?.status === "Expired";

    return (
        <div className="max-w-4xl mx-auto space-y-6 p-6">
            <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center">
                    <CreditCard className="h-5 w-5 text-primary" />
                </div>
                <div>
                    <h1 className="text-xl font-semibold tracking-tight">Billing & Subscription</h1>
                    <p className="text-sm text-muted-foreground">Manage your organization's subscription plan</p>
                </div>
            </div>

            {/* Current subscription status */}
            {sub && (
                <Card className={cn(
                    "p-4 flex items-start gap-3",
                    isExpired ? "border-destructive/50 bg-destructive/5" :
                    expiryWarning ? "border-yellow-500/50 bg-yellow-500/5" :
                    "border-primary/20 bg-primary/5"
                )}>
                    {isExpired ? (
                        <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
                    ) : expiryWarning ? (
                        <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 shrink-0" />
                    ) : (
                        <Clock className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    )}
                    <div className="text-sm space-y-0.5">
                        <p className="font-medium">
                            {isExpired
                                ? `${sub.planName} subscription expired`
                                : `${sub.planName} (${sub.billingCycle})`}
                        </p>
                        {!isExpired && (
                            <p className="text-muted-foreground">
                                Expires {new Date(sub.endDate).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}
                                {expiryWarning && (
                                    <span className={cn("ml-2 font-semibold", sub.daysUntilExpiry <= 1 ? "text-destructive" : "text-yellow-600")}>
                                        — {sub.daysUntilExpiry === 0 ? "expires today" : `${sub.daysUntilExpiry} day${sub.daysUntilExpiry !== 1 ? "s" : ""} left`}
                                    </span>
                                )}
                            </p>
                        )}
                        {isExpired && (
                            <p className="text-muted-foreground">
                                Expired on {new Date(sub.endDate).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}. Subscribe below to restore access.
                            </p>
                        )}
                    </div>
                </Card>
            )}

            {plansLoading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
                    <Loader2 className="h-5 w-5 animate-spin" />
                                    Loading plans…
                </div>
            )}

            {plansError && <p className="text-sm text-destructive">{plansError}</p>}

            {!plansLoading && billing && (
                <>
                    {/* Billing cycle toggle (only relevant for paid plans) */}
                    {billing.plans.some(p => !p.isFreePlan) && (
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Billing cycle:</span>
                            <div className="flex rounded-lg border overflow-hidden text-sm">
                                {(["Monthly", "Yearly"] as BillingCycle[]).map(cycle => (
                                    <button
                                        key={cycle}
                                        type="button"
                                        onClick={() => setBillingCycle(cycle)}
                                        className={cn(
                                            "px-4 py-1.5 transition-colors",
                                            billingCycle === cycle
                                                ? "bg-primary text-primary-foreground"
                                                : "hover:bg-muted"
                                        )}
                                    >
                                        {cycle}
                                        {cycle === "Yearly" && (
                                            <span className="ml-1.5 text-xs opacity-75">Save ~17%</span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="grid gap-4 sm:grid-cols-3">
                        {billing.plans.map((p) => {
                            const isCurrent = p.code === billing.currentPlanCode;
                            const isSelected = p.code === selectedPlanCode;
                            const isDisabled = isCheckoutDisabled(p);
                            const freeAlreadyUsed = p.isFreePlan && billing.hasUsedFreePlan;
                            const displayPrice = p.isFreePlan
                                ? 0
                                : billingCycle === "Yearly"
                                    ? p.yearlyPricePesos
                                    : p.pricePesos;

                            return (
                                <button
                                    key={p.code}
                                    type="button"
                                    disabled={isDisabled}
                                    onClick={() => !isDisabled && setSelectedPlanCode(p.code)}
                                    className={cn(
                                        "text-left rounded-xl border-2 p-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                        isSelected && !isDisabled ? "border-primary bg-primary/5" : "border-border",
                                        isDisabled
                                            ? "opacity-50 cursor-not-allowed"
                                            : "hover:border-muted-foreground/30"
                                    )}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <p className="font-semibold">{p.displayName}</p>
                                            <p className="text-2xl font-semibold tracking-tight mt-1">
                                                {displayPrice === 0 ? "Free" : `₱${displayPrice.toLocaleString()}`}
                                                {displayPrice > 0 && (
                                                    <span className="text-sm font-normal text-muted-foreground">
                                                        {" "}/ {billingCycle === "Yearly" ? "year" : "month"}
                                                    </span>
                                                )}
                                            </p>
                                        </div>
                                        {isSelected && !isDisabled && (
                                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                                                <Check className="h-4 w-4" />
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-3 leading-relaxed">{p.summary}</p>
                                    {isCurrent && !isExpired && (
                                        <span className="inline-block mt-3 text-xs font-medium text-primary">
                                            Current plan
                                        </span>
                                    )}
                                    {freeAlreadyUsed && (
                                        <span className="inline-block mt-3 text-xs font-medium text-muted-foreground">
                                            Free plan already used
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {error && <p className="text-sm text-destructive">{error}</p>}

                    <Card className="p-6">
                        {selectedPlanCode && billing.plans.find(p => p.code === selectedPlanCode)?.isFreePlan ? (
                            <div className="space-y-3">
                                <p className="text-sm text-muted-foreground">
                                    The free plan is available once per organization. No payment required.
                                </p>
                                <Button
                                    type="button"
                                    onClick={startCheckout}
                                    disabled={busy}
                                >
                                    {busy ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Activating…</> : "Activate free plan"}
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <p className="text-sm text-muted-foreground">
                                    You will be redirected to our secure payment partner. Your subscription starts immediately after payment.
                                </p>
                                <Button
                                    type="button"
                                    onClick={startCheckout}
                                    disabled={busy || !selectedPlanCode || (selectedPlanCode ? isCheckoutDisabled(billing.plans.find(p => p.code === selectedPlanCode)!) : true)}
                                >
                                    {busy ? (
                                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Starting…</>
                                    ) : (
                                        "Continue to secure checkout"
                                    )}
                                </Button>
                            </div>
                        )}
                    </Card>
                </>
            )}
        </div>
    );
}
