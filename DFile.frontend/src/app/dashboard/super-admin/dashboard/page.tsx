"use client";

import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ShieldAlert, Users, Activity, Settings, Building2, Shield, Clock3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function SuperAdminDashboard() {
    const { user, isLoggedIn, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading) {
            if (!isLoggedIn) {
                router.replace("/login");
            } else if (user?.role !== "Super Admin") {
                router.replace("/dashboard");
            }
        }
    }, [user, isLoggedIn, isLoading]); // eslint-disable-line react-hooks/exhaustive-deps

    if (isLoading || !user || user.role !== "Super Admin") {
        return null; // or a spinner/unauthorized view
    }

    return (
        <div className="space-y-6">
            
            {/* QUICK ACTIONS / STATS */}
            <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* Create Tenant CTA */}
                <Card
                    className="relative overflow-hidden cursor-pointer border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background hover:shadow-md transition-all pt-2"
                    onClick={() => router.push("/dashboard/super-admin/create-tenant")}
                >
                    <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-primary/10" />
                    <CardHeader className="relative z-10 flex flex-row items-center justify-between space-y-0 pb-2 px-6">
                        <CardTitle className="text-sm font-medium">Create Tenant</CardTitle>
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shrink-0">
                            <Building2 className="h-4 w-4" />
                        </span>
                    </CardHeader>
                    <CardContent className="relative z-10 space-y-1 px-6 pb-6">
                        <div className="text-2xl font-bold text-primary">+ New Organization</div>
                    </CardContent>
                </Card>

                {/* Roles */}
                <Card className="pt-2">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-6">
                        <CardTitle className="text-sm font-medium">System Role Management</CardTitle>
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-muted shrink-0">
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </span>
                    </CardHeader>
                    <CardContent className="space-y-1 px-6 pb-6">
                        <div className="text-2xl font-bold">4 Roles</div>
                    </CardContent>
                </Card>

                {/* System Health */}
                <Card className="pt-2">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-6">
                        <CardTitle className="text-sm font-medium">System Health</CardTitle>
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-muted shrink-0">
                            <Activity className="h-4 w-4 text-emerald-500" />
                        </span>
                    </CardHeader>
                    <CardContent className="space-y-3 px-6 pb-6">
                        <div className="text-2xl font-bold text-emerald-500">98.2%</div>
                        <div className="h-1.5 w-full rounded-full bg-muted">
                            <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: "98%" }} />
                        </div>
                    </CardContent>
                </Card>

                {/* Global Settings */}
                <Card className="pt-2">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-6">
                        <CardTitle className="text-sm font-medium">Global Settings</CardTitle>
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-muted shrink-0">
                            <Settings className="h-4 w-4 text-muted-foreground" />
                        </span>
                    </CardHeader>
                    <CardContent className="space-y-2 px-6 pb-6">
                        <div className="text-2xl font-bold">Config</div>
                    </CardContent>
                </Card>
            </section>

            {/* LOWER GRID: AUDIT LOGS */}
            <section className="grid gap-4 lg:grid-cols-3">
                {/* Audit Logs */}
                <Card className="lg:col-span-3">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                        <div>
                            <CardTitle className="text-base font-semibold">Recent Audit Logs</CardTitle>
                            <CardDescription className="text-xs">
                                Track sensitive changes made by privileged accounts.
                            </CardDescription>
                        </div>
                        <Badge variant="outline" className="gap-1 text-xs">
                            <Clock3 className="h-3 w-3" />
                            Live snapshot
                        </Badge>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {/* Log item 1 */}
                            <div className="flex items-start gap-3 border-b pb-3 last:border-b-0 last:pb-0">
                                <div className="mt-1 h-2 w-2 rounded-full bg-amber-500" />
                                <div className="flex-1 space-y-1">
                                    <p className="text-sm font-medium">User Role Updated</p>
                                    <p className="text-xs text-muted-foreground">
                                        Admin changed to Super Admin for user: <span className="font-mono">root</span>
                                    </p>
                                </div>
                                <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                                    2 mins ago
                                </span>
                            </div>

                            {/* Log item 2 */}
                            <div className="flex items-start gap-3 border-b pb-3 last:border-b-0 last:pb-0">
                                <div className="mt-1 h-2 w-2 rounded-full bg-emerald-500" />
                                <div className="flex-1 space-y-1">
                                    <p className="text-sm font-medium">System Backup</p>
                                    <p className="text-xs text-muted-foreground">
                                        Automatic backup completed successfully.
                                    </p>
                                </div>
                                <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                                    2 hours ago
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </section>
        </div>
    );
}