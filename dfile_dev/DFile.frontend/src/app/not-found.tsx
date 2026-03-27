"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileQuestion } from "lucide-react";

export default function NotFound() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-background px-4">
            <div className="text-center max-w-md space-y-6">
                <div className="mx-auto w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
                    <FileQuestion className="w-8 h-8 text-muted-foreground" />
                </div>
                <div className="space-y-2">
                    <h1 className="text-4xl font-bold text-foreground">404</h1>
                    <p className="text-lg text-muted-foreground">
                        Page not found
                    </p>
                    <p className="text-sm text-muted-foreground/70">
                        The page you&apos;re looking for doesn&apos;t exist or has been moved.
                    </p>
                </div>
                <Button asChild>
                    <Link href="/">Back to Dashboard</Link>
                </Button>
            </div>
        </div>
    );
}
