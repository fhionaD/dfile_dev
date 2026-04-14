"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/auth-context";

const FinanceDashboard = dynamic(() => import("@/components/finance-dashboard").then(m => ({ default: m.FinanceDashboard })), {
    loading: () => <Card className="p-6"><Skeleton className="h-72 w-full" /></Card>,
});

/** Full depreciation workflows live under /finance/depreciation — no duplicate tab here. */
export default function FinanceDashboardPage() {
    const { user, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (isLoading || !user) return;
        if (user.role === "Admin") {
            router.replace("/finance/assets");
        }
    }, [isLoading, user, router]);

    if (!isLoading && user?.role === "Admin") {
        return (
            <div className="space-y-8">
                <Card className="p-6">
                    <Skeleton className="h-72 w-full" />
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <FinanceDashboard />
        </div>
    );
}
