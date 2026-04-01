"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, UserPlus } from "lucide-react";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

const TenantList = dynamic(() => import("@/components/tenant-list").then(m => ({ default: m.TenantList })), {
    loading: () => <Card className="p-6"><Skeleton className="h-72 w-full" /></Card>,
});
const TenantRegistrationForm = dynamic(() => import("@/components/forms/tenant-registration-form"), {
    loading: () => <Card className="p-6"><Skeleton className="h-72 w-full" /></Card>,
});

export default function TenantOversightPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                    <h1 className="text-xl font-semibold tracking-tight">Tenant Oversight</h1>
                    <p className="text-sm text-muted-foreground">Manage and monitor all platform tenants</p>
                </div>
            </div>

            <Tabs defaultValue="tenants" className="space-y-6">
                <TabsList className="h-11 p-1 gap-1">
                    <TabsTrigger value="tenants" className="h-9 px-4 gap-2 data-[state=active]:shadow-sm">
                        <Building2 className="h-4 w-4" />
                        All Tenants
                    </TabsTrigger>
                    <TabsTrigger value="register" className="h-9 px-4 gap-2 data-[state=active]:shadow-sm">
                        <UserPlus className="h-4 w-4" />
                        Register Tenant
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="tenants" className="mt-0">
                    <TenantList />
                </TabsContent>
                <TabsContent value="register" className="mt-0">
                    <TenantRegistrationForm />
                </TabsContent>
            </Tabs>
        </div>
    );
}
