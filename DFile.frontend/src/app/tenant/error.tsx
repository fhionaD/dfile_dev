"use client";

import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TenantError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    const router = useRouter();

    return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-6">
            <AlertCircle className="h-12 w-12 text-destructive" />
            <h1 className="text-2xl font-semibold">Something went wrong</h1>
            <p className="max-w-md text-center text-sm text-muted-foreground">{error.message}</p>
            <div className="flex gap-2">
                <Button onClick={() => reset()}>Try again</Button>
                <Button variant="outline" onClick={() => router.push("/login")}>
                    Back to login
                </Button>
            </div>
        </div>
    );
}
