"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { useMaintenanceContext } from "@/contexts/maintenance-context";
import { useAuth } from "@/contexts/auth-context";

const FinanceDashboard = dynamic(() => import("@/components/finance-dashboard").then(m => ({ default: m.FinanceDashboard })), {
    loading: () => <Card className="p-6"><Skeleton className="h-72 w-full" /></Card>,
});

export default function MaintenanceFinancePage() {
    const { user, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (isLoading || !user) return;
        if (user.role !== "Finance") {
            router.replace("/maintenance/dashboard");
        }
    }, [isLoading, user, router]);

    // Get glassmorphism setting from context
    const { enableGlassmorphism } = useMaintenanceContext();
    const cardClassName = enableGlassmorphism 
        ? "border border-white/20 bg-white/10 dark:bg-black/10 backdrop-blur-xl ring-1 ring-white/10" 
        : "";

    if (!isLoading && user?.role !== "Finance") {
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
            <FinanceDashboard cardClassName={cardClassName} />
        </div>
    );
}
