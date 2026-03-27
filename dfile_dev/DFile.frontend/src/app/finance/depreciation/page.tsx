"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

const DepreciationView = dynamic(() => import("@/components/depreciation-view").then(m => ({ default: m.DepreciationView })), {
    loading: () => <Card className="p-6"><Skeleton className="h-72 w-full" /></Card>,
});

export default function DepreciationPage() {
    return <DepreciationView />;
}
