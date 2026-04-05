"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

const FinanceDashboard = dynamic(() => import("@/components/finance-dashboard").then(m => ({ default: m.FinanceDashboard })), {
    loading: () => <Card className="p-6"><Skeleton className="h-72 w-full" /></Card>,
});

/** Full depreciation workflows live under /finance/depreciation — no duplicate tab here. */
export default function FinanceDashboardPage() {
    return (
        <div className="space-y-8">
            <FinanceDashboard />
        </div>
    );
}
