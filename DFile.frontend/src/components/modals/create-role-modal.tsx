"use client";

import { useState } from "react";
import { ShieldAlert, Briefcase, Layers, FileText } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface CreateRoleModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (role: { id: string; designation: string; department: string; scope: string }) => void;
}

export function CreateRoleModal({ open, onOpenChange, onSave }: CreateRoleModalProps) {
    const [roleData, setRoleData] = useState({ designation: "", department: "", scope: "" });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ ...roleData, id: Date.now().toString() });
        setRoleData({ designation: "", department: "", scope: "" });
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xl rounded-2xl border-border p-0 overflow-hidden flex flex-col">
                <DialogHeader className="p-6 bg-muted/40 border-b border-border shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/10 rounded-xl text-primary"><ShieldAlert size={20} /></div>
                        <div>
                            <DialogTitle className="text-lg font-semibold text-foreground">Define Personnel Role</DialogTitle>
                            <DialogDescription className="text-muted-foreground text-xs mt-1">Permission Hierarchy Configuration</DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <form id="role-form" onSubmit={handleSubmit} className="p-6 space-y-6 flex-1 overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                                <Briefcase size={12} /> Role Designation
                            </Label>
                            <Input required value={roleData.designation} onChange={(e) => setRoleData({ ...roleData, designation: e.target.value })} placeholder="e.g. Senior Fleet Technician" className="h-10 bg-background text-sm" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                                <Layers size={12} /> Department
                            </Label>
                            <Input required value={roleData.department} onChange={(e) => setRoleData({ ...roleData, department: e.target.value })} placeholder="e.g. Logistics & Supply" className="h-10 bg-background text-sm" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                            <FileText size={12} /> Scope of Responsibility
                        </Label>
                        <Textarea rows={4} value={roleData.scope} onChange={(e) => setRoleData({ ...roleData, scope: e.target.value })} placeholder="Describe the primary duties..." className="bg-background text-sm resize-none" />
                    </div>
                </form>

                <DialogFooter className="gap-3 p-6 bg-muted/40 border-t border-border shrink-0">
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1 rounded-xl">
                        Cancel
                    </Button>
                    <Button type="submit" form="role-form" className="flex-2 rounded-xl bg-primary text-primary-foreground shadow-lg hover:bg-primary/90">
                        Deploy Role
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
