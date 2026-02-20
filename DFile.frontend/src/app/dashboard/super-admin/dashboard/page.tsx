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
                router.push("/login");
            } else if (user?.role !== "Super Admin") {
                router.push("/dashboard");
            }
        }
    }, [user, isLoggedIn, isLoading, router]);

    if (isLoading || !user || user.role !== "Super Admin") {
        return null; // or a spinner/unauthorized view
    }

    return (
        <div className="space-y-8">
            {/* TOP BAR */}
            <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                            <ShieldAlert className="h-4 w-4" />
                        </span>
                        Super Admin Control Panel
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        Configure tenants, roles, and global settings across the entire platform.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <Badge variant="outline" className="gap-2 px-3 py-1">
                        <Shield className="h-3 w-3" />
                        <span className="text-xs font-medium uppercase tracking-wide">
                            {user.role}
                        </span>
                    </Badge>
                    <div className="text-right">
                        <p className="text-xs text-muted-foreground">Signed in as</p>
                        <p className="text-sm font-medium truncate max-w-[180px]">
                            {(user as any).email ?? user.name ?? "Root Account"}
                        </p>
                    </div>
                </div>
            </header>

            {/* QUICK ACTIONS / STATS */}
            <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* Create Tenant CTA */}
                <Card
                    className="relative overflow-hidden cursor-pointer border-primary/20 bg-gradient-to-br from-primary/10 via-background to-background hover:shadow-md transition-all"
                    onClick={() => router.push("/dashboard/super-admin/create-tenant")}
                >
                    <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-primary/10" />
                    <CardHeader className="relative z-10 flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Create Tenant</CardTitle>
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                            <Building2 className="h-4 w-4" />
                        </span>
                    </CardHeader>
                    <CardContent className="relative z-10 space-y-1">
                        <div className="text-2xl font-bold text-primary">+ New Organization</div>
                        <p className="text-xs text-muted-foreground">
                            Onboard a new tenant and assign a subscription plan.
                        </p>
                    </CardContent>
                </Card>

                {/* Roles */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <div className="space-y-1">
                            <CardTitle className="text-sm font-medium">System Role Management</CardTitle>
                            <CardDescription className="text-xs">
                                Define what each role can see and do across modules.
                            </CardDescription>
                        </div>
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </span>
                    </CardHeader>
                    <CardContent className="space-y-1">
                        <div className="text-2xl font-bold">4 Roles</div>
                        <p className="text-xs text-muted-foreground">
                            Super Admin, Tenant Admin, Finance, Maintenance.
                        </p>
                    </CardContent>
                </Card>

                {/* System Health */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <div className="space-y-1">
                            <CardTitle className="text-sm font-medium">System Health</CardTitle>
                            <CardDescription className="text-xs">
                                Overall uptime and service availability.
                            </CardDescription>
                        </div>
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                            <Activity className="h-4 w-4 text-emerald-500" />
                        </span>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="text-2xl font-bold text-emerald-500">98.2%</div>
                        <div className="h-1.5 w-full rounded-full bg-muted">
                            <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: "98%" }} />
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Last 30 days of monitored uptime.
                        </p>
                    </CardContent>
                </Card>

                {/* Global Settings */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <div className="space-y-1">
                            <CardTitle className="text-sm font-medium">Global Settings</CardTitle>
                            <CardDescription className="text-xs">
                                High-level parameters affecting all tenants.
                            </CardDescription>
                        </div>
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                            <Settings className="h-4 w-4 text-muted-foreground" />
                        </span>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div className="text-2xl font-bold">Config</div>
                        <div className="flex flex-wrap gap-1">
                            <Badge variant="outline" className="text-[10px] font-normal">
                                Billing & Plans
                            </Badge>
                            <Badge variant="outline" className="text-[10px] font-normal">
                                Security
                            </Badge>
                            <Badge variant="outline" className="text-[10px] font-normal">
                                Branding
                            </Badge>
                        </div>
                    </CardContent>
                </Card>
            </section>

            {/* LOWER GRID: AUDIT LOGS + SECURITY SNAPSHOT */}
            <section className="grid gap-4 lg:grid-cols-3">
                {/* Audit Logs */}
                <Card className="lg:col-span-2">
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

                {/* Security / Governance Snapshot */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base font-semibold">Security & Governance</CardTitle>
                        <CardDescription className="text-xs">
                            High-level policies enforced by the Super Admin layer.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 text-xs text-muted-foreground">
                        <div className="flex items-start gap-2">
                            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                            <p>
                                Role-based access control with clearly separated Super Admin and tenant-level
                                permissions.
                            </p>
                        </div>
                        <div className="flex items-start gap-2">
                            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                            <p>
                                Centralized configuration for subscription plans, tenant limits, and feature toggles.
                            </p>
                        </div>
                        <div className="flex items-start gap-2">
                            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                            <p>
                                Regular backups and change tracking through audit logs for compliance and recovery.
                            </p>
                        </div>
                        <div className="flex items-start gap-2">
                            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                            <p>
                                Scoped access for Finance and Maintenance managers within each tenant boundary.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </section>
        </div>
    );
}