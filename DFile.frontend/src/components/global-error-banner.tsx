"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlobalErrorPayload, subscribeGlobalError, emitGlobalError } from "@/lib/global-error-bus";

export function GlobalErrorBanner() {
    const [errors, setErrors] = useState<GlobalErrorPayload[]>([]);

    useEffect(() => {
        const unsubscribe = subscribeGlobalError((payload) => {
            setErrors((prev) => [payload, ...prev].slice(0, 3));
        });

        const onUnhandledRejection = (event: PromiseRejectionEvent) => {
            const reason = event.reason;
            const message =
                (typeof reason === "object" && reason?.message) ||
                (typeof reason === "string" ? reason : "An unexpected async error occurred.");
            emitGlobalError({
                title: "Unhandled Promise Error",
                message,
                level: "error",
            });
        };

        const onWindowError = (event: ErrorEvent) => {
            emitGlobalError({
                title: "Unexpected Runtime Error",
                message: event.message || "An unexpected runtime error occurred.",
                level: "error",
            });
        };

        window.addEventListener("unhandledrejection", onUnhandledRejection);
        window.addEventListener("error", onWindowError);

        return () => {
            unsubscribe();
            window.removeEventListener("unhandledrejection", onUnhandledRejection);
            window.removeEventListener("error", onWindowError);
        };
    }, []);

    const latest = useMemo(() => errors[0], [errors]);
    if (!latest) return null;

    const dismissLatest = () => {
        setErrors((prev) => prev.filter((e) => e.id !== latest.id));
    };

    return (
        <div className="fixed top-0 inset-x-0 z-[100] px-3 pt-3">
            <div className="mx-auto max-w-7xl rounded-md border border-destructive/30 bg-destructive/10 text-destructive shadow-sm">
                <div className="flex items-start justify-between gap-3 p-3">
                    <div className="flex items-start gap-2">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        <div className="space-y-0.5">
                            <p className="text-sm font-semibold">{latest.title}</p>
                            <p className="text-xs text-destructive/90">{latest.message}</p>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/20" onClick={dismissLatest}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
