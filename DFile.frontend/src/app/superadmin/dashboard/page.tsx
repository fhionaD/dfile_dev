"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Activity, Building2, Users, ArrowRight } from "lucide-react";
import { StatusText } from "@/components/ui/status-text";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useTenants } from "@/hooks/use-tenants";

export default function SuperAdminDashboard() {
    const router = useRouter();
    const { data: tenants = [], isLoading } = useTenants();

    const activeTenants = tenants.filter(t => t.status === "Active");
    const suspendedTenants = tenants.filter(t => t.status === "Suspended");

    return (
        <div className="space-y-8">
            {/* KPI Stats */}
            <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
                {/* Manage Tenants CTA */}
                <Card
                    className="group relative overflow-hidden cursor-pointer bg-gradient-to-br from-primary/5 to-transparent hover:shadow-lg transition-all duration-300"
                    onClick={() => router.push("/superadmin/tenant-oversight")}
                >
                    <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-primary/10 group-hover:scale-110 transition-transform duration-300" />
                    <div className="p-6 relative z-10 space-y-4">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">Tenant Oversight</p>
                            <div className="h-11 w-11 rounded-xl bg-primary flex items-center justify-center">
                                <Building2 className="h-5 w-5 text-primary-foreground" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <p className="text-2xl font-bold text-primary">Manage Tenants</p>
                            <Button variant="ghost" size="sm" className="p-0 h-auto text-primary hover:bg-transparent hover:text-primary/80 gap-1">
                                View all <ArrowRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </Card>

                {/* Active Tenants */}
                <Card>
                    <div className="p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">Active Tenants</p>
                            <div className="h-11 w-11 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                                <Building2 className="h-5 w-5 text-emerald-600" />
                            </div>
                        </div>
                        <div>
                            {isLoading ? (
                                <Skeleton className="h-9 w-16" />
                            ) : (
                                <p className="text-3xl font-bold tracking-tight">{activeTenants.length}</p>
                            )}
                            <p className="text-sm text-muted-foreground mt-1">Organizations</p>
                        </div>
                    </div>
                </Card>

                {/* Total Tenants */}
                <Card>
                    <div className="p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">Total Tenants</p>
                            <div className="h-11 w-11 rounded-xl bg-blue-500/10 flex items-center justify-center">
                                <Users className="h-5 w-5 text-blue-600" />
                            </div>
                        </div>
                        <div>
                            {isLoading ? (
                                <Skeleton className="h-9 w-16" />
                            ) : (
                                <p className="text-3xl font-bold tracking-tight">{tenants.length}</p>
                            )}
                            <p className="text-sm text-muted-foreground mt-1">Registered</p>
                        </div>
                    </div>
                </Card>

                {/* Suspended Tenants */}
                <Card>
                    <div className="p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-muted-foreground">Suspended</p>
                            <div className="h-11 w-11 rounded-xl bg-amber-500/10 flex items-center justify-center">
                                <Activity className="h-5 w-5 text-amber-600" />
                            </div>
                        </div>
                        <div>
                            {isLoading ? (
                                <Skeleton className="h-9 w-16" />
                            ) : (
                                <p className="text-3xl font-bold tracking-tight">{suspendedTenants.length}</p>
                            )}
                            <p className="text-sm text-muted-foreground mt-1">Suspended tenants</p>
                        </div>
                    </div>
                </Card>
            </section>

            {/* Tenant List Summary */}
            <section>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Tenants</CardTitle>
                            <CardDescription>All registered organizations in the platform</CardDescription>
                        </div>
                        <Badge variant="outline" className="gap-1.5 h-7">
                            {isLoading ? "..." : `${tenants.length} total`}
                        </Badge>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="space-y-3">
                                {[...Array(3)].map((_, i) => (
                                    <Skeleton key={i} className="h-12 w-full" />
                                ))}
                            </div>
                        ) : tenants.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                                <Building2 className="h-12 w-12 mx-auto mb-4 opacity-20" />
                                <p>No tenants registered yet</p>
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {tenants.slice(0, 5).map(tenant => (
                                    <div key={tenant.id} className="flex items-center gap-4 p-4 rounded-xl hover:bg-muted/50 transition-colors">
                                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                            <Building2 className="h-4 w-4 text-primary" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold truncate">{tenant.name}</p>
                                            <p className="text-xs text-muted-foreground">Created {new Date(tenant.createdAt).toLocaleDateString()}</p>
                                        </div>
                                        <StatusText variant={tenant.status === "Active" ? "success" : "muted"}>{tenant.status}</StatusText>
                                    </div>
                                ))}
                                {tenants.length > 5 && (
                                    <p className="text-sm text-muted-foreground text-center pt-2">
                                        +{tenants.length - 5} more tenants
                                    </p>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </section>
        </div>
    );
}
