"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Users, ShieldCheck, Building2, MapPin, Tag } from "lucide-react";
import { useEmployees, useRoles, useDepartments } from "@/hooks/use-organization";
import { useRooms } from "@/hooks/use-rooms";
import { useCategories } from "@/hooks/use-categories";

export default function TenantDashboardPage() {
    const { data: employees = [], isLoading: empLoading } = useEmployees();
    const { data: roles = [], isLoading: rolesLoading } = useRoles();
    const { data: departments = [], isLoading: deptLoading } = useDepartments();
    const { data: rooms = [], isLoading: roomsLoading } = useRooms();
    const { data: categories = [], isLoading: catLoading } = useCategories();

    const activeEmployees = employees.filter(e => e.status === "Active");
    const activeRoles = roles.filter(r => r.status === "Active");
    const activeDepts = departments.filter(d => d.status === "Active");
    // archived rooms are excluded by the API (showArchived=false default), status filter removes Deactivated
    const activeRooms = rooms.filter(r => !r.archived && r.status !== "Deactivated");
    const activeCategories = categories.filter(c => c.status === "Active");

    const stats = [
        { label: "Active Users", value: activeEmployees.length, total: employees.length, icon: Users, color: "text-blue-600", bg: "bg-blue-500/10", isLoading: empLoading },
        { label: "Roles Defined", value: activeRoles.length, total: roles.length, icon: ShieldCheck, color: "text-violet-600", bg: "bg-violet-500/10", isLoading: rolesLoading },
        { label: "Departments", value: activeDepts.length, total: departments.length, icon: Building2, color: "text-emerald-600", bg: "bg-emerald-500/10", isLoading: deptLoading },
        { label: "Locations", value: activeRooms.length, total: rooms.length, icon: MapPin, color: "text-teal-600", bg: "bg-teal-500/10", isLoading: roomsLoading },
        { label: "Asset Categories", value: activeCategories.length, total: categories.length, icon: Tag, color: "text-amber-600", bg: "bg-amber-500/10", isLoading: catLoading },
    ];

    return (
        <div className="space-y-8">
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                {stats.map((s) => (
                    <Card key={s.label}>
                        <div className="p-5 space-y-4">
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-muted-foreground">{s.label}</p>
                                <div className={`h-10 w-10 rounded-xl ${s.bg} flex items-center justify-center`}>
                                    <s.icon className={`h-5 w-5 ${s.color}`} />
                                </div>
                            </div>
                            {s.isLoading ? (
                                <Skeleton className="h-10 w-16" />
                            ) : (
                                <div>
                                    <p className="text-3xl font-bold tracking-tight">{s.value}</p>
                                    <p className="text-xs text-muted-foreground mt-1">{s.total} total</p>
                                </div>
                            )}
                        </div>
                    </Card>
                ))}
            </section>

            {/* Recent Employees Section */}
            <Card>
                <CardHeader>
                    <CardTitle>Recent Users</CardTitle>
                    <CardDescription>Latest personnel added to the organization</CardDescription>
                </CardHeader>
                <CardContent>
                    {empLoading ? (
                        <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
                    ) : activeEmployees.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <Users className="h-12 w-12 mx-auto mb-4 opacity-20" />
                            <p>No users added yet</p>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {activeEmployees.slice(0, 5).map(emp => (
                                <div key={emp.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-muted/50 transition-colors">
                                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                        <Users className="h-4 w-4 text-primary" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold truncate">{emp.firstName} {emp.lastName}</p>
                                        <p className="text-xs text-muted-foreground">{emp.department} &middot; {emp.role}</p>
                                    </div>
                                    <Badge variant="success">{emp.status}</Badge>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
