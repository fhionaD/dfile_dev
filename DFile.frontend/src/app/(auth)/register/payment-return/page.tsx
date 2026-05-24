"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { Loader2, CheckCircle, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RegistrationPaymentStatus {
    status: string;
    planName: string;
    amountCents: number;
    currency: string;
}

function formatAmount(cents: number, currency: string) {
    return new Intl.NumberFormat("en-PH", { style: "currency", currency }).format(cents / 100);
}

function PaymentReturnContent() {
    const searchParams = useSearchParams();
    const paymentId = searchParams.get("paymentId");
    const statusHint = searchParams.get("status");

    const [payment, setPayment] = useState<RegistrationPaymentStatus | null>(null);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
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
                const { data } = await api.get<RegistrationPaymentStatus>(
                    `/api/Payments/registration/${encodeURIComponent(paymentId)}`
                );
                if (cancelled) return;
                setPayment(data);
                if (data.status !== "Pending") stopPolling();
            } catch {
                if (!cancelled) {
                    setFetchError("Could not load payment status. Please refresh or contact support.");
                    stopPolling();
                }
            }
        };

        void load();
        pollRef.current = setInterval(() => void load(), 2500);
        // Stop polling after 90 s — user may need to wait for webhook
        const timeout = setTimeout(stopPolling, 90_000);

        return () => {
            cancelled = true;
            clearTimeout(timeout);
            stopPolling();
        };
    }, [paymentId]);

    if (!paymentId) {
        return (
            <div className="text-center space-y-4">
                <XCircle className="mx-auto h-12 w-12 text-destructive" />
                <h2 className="text-xl font-semibold">Invalid payment link</h2>
                <p className="text-sm text-muted-foreground">
                    This page requires a valid payment reference. Please register again.
                </p>
                <Button asChild variant="outline">
                    <Link href="/register">Back to registration</Link>
                </Button>
            </div>
        );
    }

    if (fetchError) {
        return (
            <div className="text-center space-y-4">
                <XCircle className="mx-auto h-12 w-12 text-destructive" />
                <h2 className="text-xl font-semibold">Something went wrong</h2>
                <p className="text-sm text-muted-foreground">{fetchError}</p>
                <Button asChild variant="outline">
                    <Link href="/register">Back to registration</Link>
                </Button>
            </div>
        );
    }

    // Use the URL hint for instant feedback before the first poll completes
    const effectiveStatus = payment?.status ?? (statusHint === "cancelled" ? "Cancelled" : "Pending");

    if (effectiveStatus === "Paid") {
        return (
            <div className="text-center space-y-4">
                <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
                <h2 className="text-xl font-semibold text-green-800 dark:text-green-300">
                    Payment confirmed!
                </h2>
                {payment && (
                    <p className="text-sm text-muted-foreground">
                        {payment.planName} plan activated &mdash;&nbsp;
                        {formatAmount(payment.amountCents, payment.currency)} charged.
                    </p>
                )}
                <p className="text-sm text-muted-foreground">
                    Your organization is now active. Sign in with the email and password you chose during
                    registration.
                </p>
                <Button asChild>
                    <Link href="/login">Sign in now</Link>
                </Button>
            </div>
        );
    }

    if (effectiveStatus === "Failed" || effectiveStatus === "Expired") {
        return (
            <div className="text-center space-y-4">
                <XCircle className="mx-auto h-12 w-12 text-destructive" />
                <h2 className="text-xl font-semibold">
                    Payment {effectiveStatus === "Failed" ? "failed" : "expired"}
                </h2>
                <p className="text-sm text-muted-foreground">
                    Your organization was not activated. Please register again to start a new payment session.
                </p>
                <Button asChild>
                    <Link href="/register">Register again</Link>
                </Button>
            </div>
        );
    }

    if (effectiveStatus === "Cancelled") {
        return (
            <div className="text-center space-y-4">
                <Clock className="mx-auto h-12 w-12 text-amber-500" />
                <h2 className="text-xl font-semibold">Payment cancelled</h2>
                <p className="text-sm text-muted-foreground">
                    You cancelled the payment. Register again to create a new payment session.
                </p>
                <Button asChild variant="outline">
                    <Link href="/register">Back to registration</Link>
                </Button>
            </div>
        );
    }

    // Pending — polling in progress
    return (
        <div className="text-center space-y-4">
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
            <h2 className="text-xl font-semibold">Processing payment&hellip;</h2>
            <p className="text-sm text-muted-foreground">
                Please wait while we confirm your payment with PayMongo. This may take a few seconds.
            </p>
            <p className="text-xs text-muted-foreground/60">Do not close this tab.</p>
        </div>
    );
}

export default function RegistrationPaymentReturnPage() {
    return (
        <div className="flex min-h-svh items-center justify-center bg-background px-6 py-12">
            <div className="w-full max-w-md rounded-xl border bg-card p-8 shadow-sm">
                {/* Logo */}
                <div className="mb-8 flex justify-center">
                    <img src="/AMS.svg" alt="DFile" className="h-10 w-auto dark:hidden" />
                    <img src="/AMS_dark.svg" alt="DFile" className="hidden h-10 w-auto dark:block" />
                </div>

                <Suspense
                    fallback={
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    }
                >
                    <PaymentReturnContent />
                </Suspense>
            </div>
        </div>
    );
}
