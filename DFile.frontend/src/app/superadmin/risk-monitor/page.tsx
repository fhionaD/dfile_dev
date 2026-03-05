"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusText } from "@/components/ui/status-text";
import { AlertTriangle, ShieldAlert, Clock, TrendingDown, Building2 } from "lucide-react";
import { useRiskIndicators } from "@/hooks/use-tenants";

export default function RiskMonitorPage() {
    const { data: risk, isLoading } = useRiskIndicators();

    const indicators = [
        {
            label: "Expired Warranties",
            value: risk?.expiredWarranties ?? 0,
            icon: Clock,
            color: "text-red-600",
            bg: "bg-red-500/10",
            severity: "high",
            description: "Assets with expired warranty coverage",
        },
        {
            label: "Overdue Maintenance",
            value: risk?.overdueMaintenanceCount ?? 0,
            icon: AlertTriangle,
            color: "text-amber-600",
            bg: "bg-amber-500/10",
            severity: "high",
            description: "Maintenance records past scheduled date",
        },
        {
            label: "High Priority Pending",
            value: risk?.highPriorityPending ?? 0,
            icon: ShieldAlert,
            color: "text-orange-600",
            bg: "bg-orange-500/10",
            severity: "medium",
            description: "Unresolved high-priority maintenance requests",
        },
        {
            label: "Fully Depreciated",
            value: risk?.fullyDepreciated ?? 0,
            icon: TrendingDown,
            color: "text-blue-600",
            bg: "bg-blue-500/10",
            severity: "low",
            description: "Assets with zero remaining book value",
        },
        {
            label: "Suspended Tenants",
            value: risk?.suspendedTenants ?? 0,
            icon: Building2,
            color: "text-red-600",
            bg: "bg-red-500/10",
            severity: risk?.suspendedTenants ? "high" : "low",
            description: "Tenants currently in suspended state",
        },
    ];

    const severityColor: Record<string, "danger" | "warning" | "info" | "muted"> = {
        high: "danger",
        medium: "warning",
        low: "info",
    };

    const totalRiskScore = indicators.reduce((sum, ind) => {
        const weight = ind.severity === "high" ? 3 : ind.severity === "medium" ? 2 : 1;
        return sum + ind.value * weight;
    }, 0);

    const riskLevel = totalRiskScore === 0 ? "Low" : totalRiskScore < 10 ? "Moderate" : totalRiskScore < 25 ? "Elevated" : "Critical";
    const riskBadge = totalRiskScore === 0 ? "success" : totalRiskScore < 10 ? "info" : totalRiskScore < 25 ? "warning" : "danger";

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                </div>
                <div className="flex-1">
                    <h1 className="text-xl font-semibold tracking-tight">Risk Monitor</h1>
                    <p className="text-sm text-muted-foreground">Platform-wide risk assessment and alerts</p>
                </div>
                {!isLoading && (
                    <StatusText variant={riskBadge as "success" | "info" | "warning" | "danger"} className="text-sm px-3 py-1">
                        Risk Level: {riskLevel}
                    </StatusText>
                )}
            </div>

            {/* Risk Overview Card */}
            <Card>
                <CardHeader>
                    <CardTitle>Risk Score</CardTitle>
                    <CardDescription>Weighted risk score based on all active indicators</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <Skeleton className="h-20 w-full" />
                    ) : (
                        <div className="flex items-baseline gap-2">
                            <span className="text-5xl font-bold tracking-tight">{totalRiskScore}</span>
                            <span className="text-sm text-muted-foreground">weighted points</span>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Risk Indicators */}
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {indicators.map((ind) => (
                    <Card key={ind.label} className="relative overflow-hidden">
                        <div className="p-5 space-y-4">
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-muted-foreground">{ind.label}</p>
                                <div className={`h-10 w-10 rounded-xl ${ind.bg} flex items-center justify-center`}>
                                    <ind.icon className={`h-5 w-5 ${ind.color}`} />
                                </div>
                            </div>
                            {isLoading ? (
                                <Skeleton className="h-10 w-16" />
                            ) : (
                                <>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-3xl font-bold tracking-tight">{ind.value}</span>
                                        <StatusText variant={severityColor[ind.severity]}>{ind.severity}</StatusText>
                                    </div>
                                    <p className="text-xs text-muted-foreground">{ind.description}</p>
                                </>
                            )}
                        </div>
                    </Card>
                ))}
            </section>
        </div>
    );
}
