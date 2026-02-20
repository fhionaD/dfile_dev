"use client";

import { Building2, Calendar, Users, Hotel, CreditCard, Activity, Edit } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface TenantDto {
    id: number;
    name: string;
    subscriptionPlan: number; // enum
    maxRooms: number;
    maxPersonnel: number;
    createdAt: string;
    status: string;
}

interface TenantDetailsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    tenant: TenantDto | null;
    onEdit: () => void;
}

export function TenantDetailsModal({ open, onOpenChange, tenant, onEdit }: TenantDetailsModalProps) {
    if (!tenant) return null;

    const getPlanName = (plan: number) => {
        switch(plan) {
            case 0: return "Starter";
            case 1: return "Basic";
            case 2: return "Pro";
            default: return "Unknown";
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md rounded-2xl border-border p-0 overflow-hidden flex flex-col">
                <DialogHeader className="p-6 bg-muted/30 border-b border-border shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-secondary/50 rounded-xl text-foreground">
                            <Building2 size={24} strokeWidth={1.5} />
                        </div>
                        <div>
                            <DialogTitle className="text-lg font-semibold text-foreground">Organization Details</DialogTitle>
                            <DialogDescription className="text-muted-foreground text-xs mt-1">
                                View organization information and status
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="p-6 space-y-6 flex-1 overflow-y-auto">
                    {/* Organization Name */}
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            <Building2 size={12} />
                            Organization Name
                        </div>
                        <div className="p-3 bg-muted/20 rounded-lg text-sm font-medium border border-border/50">
                            {tenant.name}
                        </div>
                    </div>

                    {/* Status & Plan */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                             <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                <Activity size={12} />
                                Status
                            </div>
                            <div className="p-3 bg-muted/20 rounded-lg text-sm font-medium border border-border/50">
                                 <span className={tenant.status === 'Active' ? 'text-emerald-600' : 'text-amber-600'}>
                                    {tenant.status}
                                 </span>
                            </div>
                        </div>
                        <div className="space-y-1">
                             <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                <CreditCard size={12} />
                                Subscription
                            </div>
                            <div className="p-3 bg-muted/20 rounded-lg text-sm font-medium border border-border/50">
                                {getPlanName(tenant.subscriptionPlan)}
                            </div>
                        </div>
                    </div>

                    {/* Limits */}
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            <Hotel size={12} />
                            Resource Limits
                        </div>
                         <div className="p-3 bg-muted/20 rounded-lg text-sm border border-border/50 grid grid-cols-2 gap-4">
                            <div>
                                <span className="text-muted-foreground text-xs block mb-0.5">Max Rooms</span>
                                <span className="font-medium">{tenant.maxRooms}</span>
                            </div>
                            <div>
                                <span className="text-muted-foreground text-xs block mb-0.5">Max Personnel</span>
                                <span className="font-medium">{tenant.maxPersonnel}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
                        <span className="flex items-center gap-1.5">
                            <Calendar size={12} />
                            Created: {new Date(tenant.createdAt).toLocaleDateString()}
                        </span>
                        <span>ID: {tenant.id}</span>
                    </div>
                </div>

                <DialogFooter className="gap-3 p-6 bg-muted/30 border-t border-border shrink-0 sm:justify-between">
                    <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">
                        Close
                    </Button>
                    <Button 
                        onClick={() => {
                            onOpenChange(false);
                            onEdit();
                        }} 
                        className="rounded-xl bg-primary text-primary-foreground shadow-sm"
                    >
                        <Edit className="mr-2 h-3.5 w-3.5" />
                        Edit Details
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
