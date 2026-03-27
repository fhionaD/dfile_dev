"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

const MaintenanceView = dynamic(() => import("@/components/maintenance-view").then(m => ({ default: m.MaintenanceView })), {
    loading: () => <Card className="p-6"><Skeleton className="h-72 w-full" /></Card>,
});

export default function MaintenanceDashboardPage() {
    return (
        <div className="space-y-8">
            <MaintenanceView />
        </div>
    );
}
