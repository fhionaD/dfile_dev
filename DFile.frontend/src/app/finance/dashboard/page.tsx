"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PieChart, TrendingDown } from "lucide-react";

const FinanceDashboard = dynamic(() => import("@/components/finance-dashboard").then(m => ({ default: m.FinanceDashboard })), {
    loading: () => <Card className="p-6"><Skeleton className="h-72 w-full" /></Card>,
});
const DepreciationView = dynamic(() => import("@/components/depreciation-view").then(m => ({ default: m.DepreciationView })), {
    loading: () => <Card className="p-6"><Skeleton className="h-72 w-full" /></Card>,
});

export default function FinanceDashboardPage() {
    return (
        <div className="space-y-8">
            <Tabs defaultValue="overview" className="space-y-6">
                <TabsList className="h-11 p-1 gap-1">
                    <TabsTrigger value="overview" className="h-9 px-4 gap-2 data-[state=active]:shadow-sm">
                        <PieChart className="h-4 w-4" />
                        Overview
                    </TabsTrigger>
                    <TabsTrigger value="depreciation" className="h-9 px-4 gap-2 data-[state=active]:shadow-sm">
                        <TrendingDown className="h-4 w-4" />
                        Depreciation
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="overview" className="mt-0">
                    <FinanceDashboard />
                </TabsContent>
                <TabsContent value="depreciation" className="mt-0">
                    <DepreciationView />
                </TabsContent>
            </Tabs>
        </div>
    );
}
