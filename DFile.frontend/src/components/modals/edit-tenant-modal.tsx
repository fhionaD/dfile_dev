"use client";

import { useEffect, useState } from "react";
import { UserPlus, Mail, Phone, Shield, Lock, Building2, Save } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner"; // Assuming sonner is used for toasts, if not I'll just remove or add a basic alert

interface TenantDto {
    id: number;
    name: string;
    subscriptionPlan: number; // enum
    maxRooms: number;
    maxPersonnel: number;
    createdAt: string;
    status: string;
}

interface EditTenantModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    tenant: TenantDto | null;
    onSave: (updatedTenant: TenantDto) => void;
}

export function EditTenantModal({ open, onOpenChange, tenant, onSave }: EditTenantModalProps) {
    const [formData, setFormData] = useState<Partial<TenantDto>>({});
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (tenant) {
            setFormData({ ...tenant });
        }
    }, [tenant]);

    const handleChange = (field: keyof TenantDto, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!tenant || !formData) return;

        setIsLoading(true);
        try {
            // Include API call here if needed, or just callback
            // For now, simulate API call success and callback
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // In a real app, you would PATCH/PUT to the backend here
            // const res = await fetch(`.../api/tenants/${tenant.id}`, { method: 'PUT', body: JSON.stringify(formData) });
            
            onSave(formData as TenantDto);
            onOpenChange(false);
            // toast.success("Tenant updated successfully");
        } catch (error) {
            console.error("Failed to update tenant", error);
            // toast.error("Failed to update tenant");
        } finally {
            setIsLoading(false);
        }
    };

    if (!tenant) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xl rounded-2xl border-border p-0 overflow-hidden flex flex-col">
                <DialogHeader className="p-6 bg-muted/40 border-b border-border shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/10 rounded-xl text-primary"><Building2 size={20} /></div>
                        <div>
                            <DialogTitle className="text-lg font-semibold text-foreground">Edit Organization</DialogTitle>
                            <DialogDescription className="text-muted-foreground text-xs mt-1">Update tenant details and subscription</DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <form id="edit-tenant-form" onSubmit={handleSubmit} className="p-6 space-y-6 flex-1 overflow-y-auto">
                    {/* Organization Details */}
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <Shield size={14} className="text-primary" />
                            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Organization Profile</h3>
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-medium text-muted-foreground">Organization Name</Label>
                                <Input 
                                    value={formData.name || ''} 
                                    onChange={(e) => handleChange('name', e.target.value)}
                                    required 
                                    className="h-10 bg-background text-sm" 
                                />
                            </div>
                        </div>
                    </div>

                    {/* Subscription & Limits */}
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <Building2 size={14} className="text-primary" />
                            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Subscription & Limits</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-medium text-muted-foreground">Subscription Plan</Label>
                                <Select 
                                    value={formData.subscriptionPlan?.toString()} 
                                    onValueChange={(val) => handleChange('subscriptionPlan', parseInt(val))}
                                >
                                    <SelectTrigger className="h-10 bg-background text-sm">
                                        <SelectValue placeholder="Select Plan" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="0">Starter</SelectItem>
                                        <SelectItem value="1">Basic</SelectItem>
                                        <SelectItem value="2">Pro</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-medium text-muted-foreground">Status</Label>
                                <Select 
                                    value={formData.status} 
                                    onValueChange={(val) => handleChange('status', val)}
                                >
                                    <SelectTrigger className="h-10 bg-background text-sm">
                                        <SelectValue placeholder="Select Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Active">Active</SelectItem>
                                        <SelectItem value="Inactive">Inactive</SelectItem>
                                        <SelectItem value="Archived">Archived</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                             <div className="space-y-2">
                                <Label className="text-xs font-medium text-muted-foreground">Max Rooms</Label>
                                <Input 
                                    type="number"
                                    value={formData.maxRooms || 0} 
                                    onChange={(e) => handleChange('maxRooms', parseInt(e.target.value))}
                                    className="h-10 bg-background text-sm" 
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-medium text-muted-foreground">Max Personnel</Label>
                                <Input 
                                    type="number"
                                    value={formData.maxPersonnel || 0} 
                                    onChange={(e) => handleChange('maxPersonnel', parseInt(e.target.value))}
                                    className="h-10 bg-background text-sm" 
                                />
                            </div>
                        </div>
                    </div>
                </form>

                <DialogFooter className="gap-3 p-6 bg-muted/40 border-t border-border shrink-0">
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1 rounded-xl">
                        Cancel
                    </Button>
                    <Button 
                        type="submit" 
                        form="edit-tenant-form" 
                        disabled={isLoading}
                        className="flex-2 rounded-xl bg-primary text-primary-foreground shadow-lg hover:bg-primary/90"
                    >
                        {isLoading ? "Saving..." : "Save Changes"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
