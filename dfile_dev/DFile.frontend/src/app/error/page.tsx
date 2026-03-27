"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function ErrorPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
            <div className="text-center max-w-md space-y-6">
                <div className="mx-auto w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
                    <AlertTriangle className="w-8 h-8 text-destructive" />
                </div>
                <div className="space-y-2">
                    <h1 className="text-4xl font-bold text-foreground">500</h1>
                    <p className="text-lg text-muted-foreground">
                        Internal Server Error
                    </p>
                    <p className="text-sm text-muted-foreground/70">
                        Something went wrong on our end. Please try again later or contact support if the problem persists.
                    </p>
                </div>
                <div className="flex gap-3 justify-center">
                    <Button variant="outline" onClick={() => window.location.reload()}>
                        Retry
                    </Button>
                    <Button asChild>
                        <Link href="/">Back to Dashboard</Link>
                    </Button>
                </div>
            </div>
        </div>
    );
}
