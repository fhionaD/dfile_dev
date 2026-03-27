"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";

export default function ForbiddenPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
            <div className="text-center max-w-md space-y-6">
                <div className="mx-auto w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
                    <ShieldAlert className="w-8 h-8 text-destructive" />
                </div>
                <div className="space-y-2">
                    <h1 className="text-4xl font-bold text-foreground">403</h1>
                    <p className="text-lg text-muted-foreground">
                        Access Denied
                    </p>
                    <p className="text-sm text-muted-foreground/70">
                        You don&apos;t have permission to access this page. Contact your administrator if you believe this is an error.
                    </p>
                </div>
                <Button asChild>
                    <Link href="/">Back to Dashboard</Link>
                </Button>
            </div>
        </div>
    );
}
