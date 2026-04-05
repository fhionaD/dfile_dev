"use client";

import { useState, useEffect } from "react";
import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Role, Employee } from "@/types/asset";

interface ChangeRoleModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    employee: Employee | null;
    roles: Role[];
    onSave: (employeeId: string, newRole: string) => Promise<void>;
    isPending?: boolean;
}

export function ChangeRoleModal({ open, onOpenChange, employee, roles, onSave, isPending }: ChangeRoleModalProps) {
    const [selectedRole, setSelectedRole] = useState("");

    useEffect(() => {
        if (employee) {
            setSelectedRole(employee.role || "");
        }
    }, [employee]);

    const handleSave = async () => {
        if (!employee || !selectedRole) return;
        await onSave(employee.id, selectedRole);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[420px]">
                <DialogHeader>
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                            <Shield className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <DialogTitle>Change Role</DialogTitle>
                            <DialogDescription>
                                {employee ? `${employee.firstName} ${employee.lastName}` : "Select a user"}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                    <div className="space-y-2">
                        <Label>Current Role</Label>
                        <p className="text-sm text-muted-foreground px-3 py-2 bg-muted/50 rounded-md">{employee?.role || "—"}</p>
                    </div>
                    <div className="space-y-2">
                        <Label>New Role <span className="text-destructive">*</span></Label>
                        <Select value={selectedRole} onValueChange={setSelectedRole}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select a role" />
                            </SelectTrigger>
                            <SelectContent>
                                {roles.map(r => (
                                    <SelectItem key={r.id} value={r.designation}>{r.designation}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button
                        onClick={handleSave}
                        disabled={isPending || !selectedRole || selectedRole === employee?.role}
                    >
                        {isPending ? "Saving..." : "Update Role"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
