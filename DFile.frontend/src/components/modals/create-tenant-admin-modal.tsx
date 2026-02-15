"use client";

import { UserPlus, Mail, Phone, Shield, Lock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CreateTenantAdminModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function CreateTenantAdminModal({ open, onOpenChange }: CreateTenantAdminModalProps) {
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xl rounded-2xl border-border p-0 overflow-hidden flex flex-col">
                <DialogHeader className="p-6 bg-muted/40 border-b border-border shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/10 rounded-xl text-primary"><UserPlus size={20} /></div>
                        <div>
                            <DialogTitle className="text-lg font-semibold text-foreground">Create Tenant Admin</DialogTitle>
                            <DialogDescription className="text-muted-foreground text-xs mt-1">Administrative Node Registration</DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <form id="tenant-admin-form" onSubmit={handleSubmit} className="p-6 space-y-6 flex-1 overflow-y-auto">
                    {/* Identity */}
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <Shield size={14} className="text-primary" />
                            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Identity Profile</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {["First Name", "Middle Name", "Surname"].map((label) => (
                                <div key={label} className="space-y-2">
                                    <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
                                    <Input required={label !== "Middle Name"} placeholder={label === "Middle Name" ? "Optional" : `e.g. ${label === "First Name" ? "John" : "Smith"}`} className="border-input bg-background" />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Contact */}
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <Mail size={14} className="text-primary" />
                            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Communications</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-medium text-muted-foreground">Email Address</Label>
                                <Input type="email" required placeholder="admin@tenant.com" className="border-input bg-background" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-medium text-muted-foreground">Contact Number</Label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                                    <Input type="tel" required placeholder="+1 (555) 000-0000" className="pl-10 border-input bg-background" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Password */}
                    <div className="pt-4 border-t border-border">
                        <div className="flex items-center gap-2 mb-3">
                            <Lock size={14} className="text-primary" />
                            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Security Credentials</h3>
                        </div>
                        <div className="space-y-2 max-w-md">
                            <Label className="text-xs font-medium text-muted-foreground">System Access Password</Label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                                <Input type="password" required placeholder="••••••••••••" className="pl-10 border-input bg-background" />
                            </div>
                            <p className="text-[10px] text-muted-foreground font-medium ml-1">Super Admin must assign a secure initial password.</p>
                        </div>
                    </div>
                </form>

                <DialogFooter className="gap-3 p-6 bg-muted/40 border-t border-border shrink-0">
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1 rounded-xl">
                        Cancel
                    </Button>
                    <Button type="submit" form="tenant-admin-form" className="flex-2 rounded-xl bg-primary text-primary-foreground shadow-lg hover:bg-primary/90">
                        Finalize Admin Creation
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
