"use client";

import { TenantRegistrationForm } from "@/components/forms/tenant-registration-form";
import { TenantList } from "@/components/tenant-list";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, UserPlus } from "lucide-react";

export default function CreateTenantPage() {
    return (
        <div className="space-y-6">

            <div className="flex flex-col gap-6">
                {/* Registration Form */}
                <div className="w-full">
                   <div className="w-full">
                        <Card className="border-border shadow-sm rounded-xl">
                            <CardHeader className="border-b border-border bg-muted/40 px-6 py-4 rounded-t-xl">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-primary/10 rounded-lg">
                                        <UserPlus className="h-5 w-5 text-primary" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-lg font-semibold">Register New Tenant</CardTitle>
                                        <CardDescription className="text-sm text-muted-foreground mt-0.5">Onboard a new organization</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-6">
                                <TenantRegistrationForm />
                            </CardContent>
                        </Card>
                   </div>
                </div>

                {/* Tenant List */}
                <div className="w-full">
                     <TenantList />
                </div>
            </div>
        </div>
    );
}
