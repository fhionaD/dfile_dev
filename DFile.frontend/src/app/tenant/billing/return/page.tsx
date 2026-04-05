"use client";

import { useEffect, useState, Suspense, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";
import Link from "next/link";
import { Loader2 } from "lucide-react";

interface PaymentStatus {
    id: string;
    status: string;
    amountCents: number;
    currency: string;
    subscriptionPlanCode?: string | null;
    description?: string | null;
    lastError?: string | null;
    lastEventType?: string | null;
}

function ReturnContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { user, isLoading } = useAuth();
    const paymentId = searchParams.get("paymentId");
    const statusHint = searchParams.get("status");
    const [payment, setPayment] = useState<PaymentStatus | null>(null);
    const [pollError, setPollError] = useState<string | null>(null);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (isLoading || !user) return;
        if (user.role !== "Admin") {
            router.replace("/forbidden");
            return;
        }
        if (!paymentId) return;

        let cancelled = false;

        const stopPolling = () => {
            if (pollRef.current !== null) {
                clearInterval(pollRef.current);
                pollRef.current = null;
            }
        };

        const load = async () => {
            try {
                const { data } = await api.get<PaymentStatus>(`/api/Payments/${paymentId}`);
                if (cancelled) return;
                setPayment(data);
                if (data.status !== "Pending") stopPolling();
            } catch {
                if (!cancelled) {
                    setPollError("Could not load payment status.");
                    stopPolling();
                }
            }
        };

        void load();
        pollRef.current = setInterval(() => {
            void load();
        }, 2000);
        const maxWait = setTimeout(stopPolling, 32_000);

        return () => {
            cancelled = true;
            clearTimeout(maxWait);
            stopPolling();
        };
    }, [isLoading, user, router, paymentId]);

    if (isLoading || !user) {
        return (
            <div className="flex justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (user.role !== "Admin") return null;

    if (!paymentId) {
        return (
            <div className="max-w-md mx-auto p-6">
                <Card className="p-6 space-y-4">
                    <p className="text-sm text-muted-foreground">Missing payment reference.</p>
                    <Button asChild variant="outline">
                        <Link href="/tenant/billing">Back to Billing</Link>
                    </Button>
                </Card>
            </div>
        );
    }

    if (pollError) {
        return (
            <div className="max-w-md mx-auto p-6">
                <Card className="p-6 space-y-4">
                    <p className="text-destructive text-sm">{pollError}</p>
                    <Button asChild variant="outline">
                        <Link href="/tenant/billing">Back to Billing</Link>
                    </Button>
                </Card>
            </div>
        );
    }

    if (!payment) {
        return (
            <div className="flex flex-col items-center justify-center p-12 gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Loading payment status…</p>
            </div>
        );
    }

    const label =
        statusHint === "cancelled"
            ? "You cancelled before completing payment."
            : payment.status === "Paid"
              ? "Payment completed successfully."
              : payment.status === "Failed"
                ? "Payment failed."
                : payment.status === "Expired"
                  ? "Payment expired."
                  : payment.status === "Cancelled"
                    ? "Payment cancelled."
                    : "Payment is still processing. This page will refresh when your payment is confirmed.";

    return (
        <div className="max-w-md mx-auto p-6 space-y-4">
            <h1 className="text-xl font-semibold">Payment status</h1>
            <Card className="p-6 space-y-3">
                <p className="text-sm">{label}</p>
                <dl className="text-sm space-y-1 text-muted-foreground">
                    <div>
                        <dt className="inline font-medium text-foreground">Status: </dt>
                        <dd className="inline">{payment.status}</dd>
                    </div>
                    <div>
                        <dt className="inline font-medium text-foreground">Amount: </dt>
                        <dd className="inline">
                            {(payment.amountCents / 100).toFixed(2)} {payment.currency}
                        </dd>
                    </div>
                    {payment.subscriptionPlanCode && (
                        <div>
                            <dt className="inline font-medium text-foreground">Plan: </dt>
                            <dd className="inline">{payment.subscriptionPlanCode}</dd>
                        </div>
                    )}
                    {payment.lastError && (
                        <div>
                            <dt className="font-medium text-destructive">Error: </dt>
                            <dd>{payment.lastError}</dd>
                        </div>
                    )}
                </dl>
                <Button asChild variant="outline" className="mt-2">
                    <Link href="/tenant/billing">Back to Billing</Link>
                </Button>
            </Card>
        </div>
    );
}

export default function BillingReturnPage() {
    return (
        <Suspense
            fallback={
                <div className="flex justify-center p-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            }
        >
            <ReturnContent />
        </Suspense>
    );
}
