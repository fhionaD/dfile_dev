"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Optionally log to an error reporting service
    }, [error]);

    return (
        <html lang="en">
            <body>
                <div className="min-h-screen flex items-center justify-center bg-background px-4">
                    <div className="text-center max-w-md space-y-6">
                        <div className="mx-auto w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
                            <AlertTriangle className="w-8 h-8 text-destructive" />
                        </div>
                        <div className="space-y-2">
                            <h1 className="text-3xl font-bold text-foreground">Something went wrong</h1>
                            <p className="text-sm text-muted-foreground">
                                An unexpected error occurred. Please try again.
                            </p>
                        </div>
                        <Button onClick={reset}>Try Again</Button>
                    </div>
                </div>
            </body>
        </html>
    );
}
