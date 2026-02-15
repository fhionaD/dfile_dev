"use client";

import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ShieldAlert, Users, Activity, Settings } from "lucide-react";

export default function SuperAdminDashboard() {
    const { user, isLoggedIn, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading) {
            if (!isLoggedIn) {
                router.push("/login");
            } else if (user?.role !== 'Super Admin') {
                router.push("/dashboard");
            }
        }
    }, [user, isLoggedIn, isLoading, router]);

    if (isLoading || !user || user.role !== 'Super Admin') {
        return null; // or a spinner/unauthorized view
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight text-destructive flex items-center gap-2">
                    <ShieldAlert /> Super Admin Control
                </h2>
                <p className="text-muted-foreground">Restricted area for system-wide configuration and oversight.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">System Role Management</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">4 Roles</div>
                        <p className="text-xs text-muted-foreground">Manage permissions and scopes</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">System Health</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-500">98.2%</div>
                        <p className="text-xs text-muted-foreground">Uptime this month</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Global Settings</CardTitle>
                        <Settings className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">Config</div>
                        <p className="text-xs text-muted-foreground">Edit global parameters</p>
                    </CardContent>
                </Card>
            </div>

            <div className="rounded-md border bg-card text-card-foreground shadow">
                <div className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Audit Logs</h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center border-b pb-2">
                            <div>
                                <p className="font-medium">User Role Updated</p>
                                <p className="text-sm text-muted-foreground">Admin changed to Super Admin for user: root</p>
                            </div>
                            <span className="text-xs text-muted-foreground">2 mins ago</span>
                        </div>
                        <div className="flex justify-between items-center border-b pb-2">
                            <div>
                                <p className="font-medium">System Backup</p>
                                <p className="text-sm text-muted-foreground">Automatic backup completed successfully</p>
                            </div>
                            <span className="text-xs text-muted-foreground">2 hours ago</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
