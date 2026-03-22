"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

const FinanceDashboard = dynamic(() => import("@/components/finance-dashboard").then(m => ({ default: m.FinanceDashboard })), {
    loading: () => <Card className="p-6"><Skeleton className="h-72 w-full" /></Card>,
});

export default function MaintenanceFinancePage() {
    return (
        <div className="space-y-8">
            <FinanceDashboard />
        </div>
    );
}
