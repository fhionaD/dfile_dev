"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import api, { getErrorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import { CreditCard, Loader2, Check } from "lucide-react";

interface BillingPlanOption {
    plan: number;
    code: string;
    displayName: string;
    pricePesos: number;
    amountCents: number;
    summary: string;
}

interface BillingPlansResponse {
    currentPlanCode: string;
    currentPlan: number;
    plans: BillingPlanOption[];
    pricingNote?: string;
}

export default function TenantBillingPage() {
    const { user, isLoading } = useAuth();
    const router = useRouter();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [plansLoading, setPlansLoading] = useState(true);
    const [plansError, setPlansError] = useState<string | null>(null);
    const [billing, setBilling] = useState<BillingPlansResponse | null>(null);
    const [selectedPlan, setSelectedPlan] = useState<number | null>(null);

    useEffect(() => {
        if (isLoading || !user) return;
        if (user.role !== "Admin") {
            router.replace("/forbidden");
        }
    }, [isLoading, user, router]);

    useEffect(() => {
        if (isLoading || !user || user.role !== "Admin") return;

        let cancelled = false;
        (async () => {
            setPlansLoading(true);
            setPlansError(null);
            try {
                const { data } = await api.get<BillingPlansResponse>("/api/Payments/billing/plans");
                if (cancelled) return;
                setBilling(data);
                setSelectedPlan(data.currentPlan);
            } catch (e: unknown) {
                if (!cancelled) setPlansError(getErrorMessage(e, "Could not load subscription plans."));
            } finally {
                if (!cancelled) setPlansLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [isLoading, user]);

    const startCheckout = async () => {
        if (selectedPlan === null) return;
        setError(null);
        setBusy(true);
        try {
            const { data } = await api.post<{ paymentId: string; checkoutUrl: string }>(
                "/api/Payments/paymongo/checkout",
                { subscriptionPlan: selectedPlan }
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

    if (isLoading || !user) return null;
    if (user.role !== "Admin") return null;

    return (
        <div className="max-w-4xl mx-auto space-y-6 p-6">
            <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center">
                    <CreditCard className="h-5 w-5 text-primary" />
                </div>
                <div>
                    <h1 className="text-xl font-semibold tracking-tight">Billing & subscription</h1>
                    <p className="text-sm text-muted-foreground">Secure payment — organization administrators only</p>
                </div>
            </div>

            {billing?.pricingNote && (
                <p className="text-xs text-muted-foreground border border-dashed rounded-lg px-3 py-2 bg-muted/30">
                    {billing.pricingNote}
                </p>
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
                    <p className="text-sm text-muted-foreground">
                        Choose the plan to pay for. The amount is set on the server for the selected tier. You will be
                        redirected to our payment partner, then returned when checkout finishes or is cancelled.
                    </p>
                    <p className="text-sm">
                        <span className="text-muted-foreground">Organization plan (before this payment): </span>
                        <span className="font-medium">{billing.currentPlanCode}</span>
                    </p>

                    <div className="grid gap-4 sm:grid-cols-3">
                        {billing.plans.map((p) => {
                            const isCurrent = p.plan === billing.currentPlan;
                            const isSelected = p.plan === selectedPlan;
                            return (
                                <button
                                    key={p.plan}
                                    type="button"
                                    onClick={() => setSelectedPlan(p.plan)}
                                    className={cn(
                                        "text-left rounded-xl border-2 p-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                        isSelected ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"
                                    )}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <p className="font-semibold">{p.displayName}</p>
                                            <p className="text-2xl font-semibold tracking-tight mt-1">
                                                ₱{p.pricePesos.toLocaleString()}
                                                <span className="text-sm font-normal text-muted-foreground"> / period</span>
                                            </p>
                                        </div>
                                        {isSelected && (
                                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                                                <Check className="h-4 w-4" />
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-3 leading-relaxed">{p.summary}</p>
                                    {isCurrent && (
                                        <span className="inline-block mt-3 text-xs font-medium text-primary">
                                            Current subscription tier
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {error && <p className="text-sm text-destructive">{error}</p>}

                    <Card className="p-6">
                        <Button
                            type="button"
                            onClick={startCheckout}
                            disabled={busy || selectedPlan === null}
                            className="w-full sm:w-auto"
                        >
                            {busy ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Starting…
                                </>
                            ) : (
                                "Continue to secure checkout"
                            )}
                        </Button>
                    </Card>
                </>
            )}
        </div>
    );
}
