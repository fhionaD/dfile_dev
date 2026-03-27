"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, Mail, Phone, Building2, ShieldCheck, CalendarClock, Hash } from "lucide-react";
import { Employee } from "@/types/asset";

import { Edit } from "lucide-react";

interface EmployeeDetailsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    employee: Employee | null;
    onEdit?: (employee: Employee) => void;
}

export function EmployeeDetailsModal({ open, onOpenChange, employee, onEdit }: EmployeeDetailsModalProps) {
    if (!employee) return null;

    const fullName = `${employee.firstName}${employee.middleName ? ` ${employee.middleName}` : ""} ${employee.lastName}`;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg rounded-2xl border-border p-0 overflow-hidden flex flex-col max-h-[85vh]">
                <DialogHeader className="p-6 bg-muted/40 border-b border-border shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12  bg-primary/10 flex items-center justify-center text-primary">
                            <User size={24} />
                        </div>
                        <div>
                            <DialogTitle className="text-lg font-semibold text-foreground">{fullName}</DialogTitle>
                            <div className="flex items-center gap-2 mt-1.5">
                                <Badge variant="secondary" className="font-mono text-xs">{employee.id}</Badge>
                                <Badge className={`text-xs ${employee.status === "Active" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"}`}>
                                    {employee.status}
                                </Badge>
                            </div>
                        </div>
                    </div>
                    <DialogDescription className="sr-only">Personnel details for {fullName}</DialogDescription>
                </DialogHeader>

                <div className="p-6 space-y-5 flex-1 overflow-y-auto">
                    {/* Contact Info */}
                    <div>
                        <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                            <Mail size={16} className="text-primary" /> Contact Information
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm bg-muted/10 p-4  border border-border/50">
                            <div>
                                <p className="text-xs text-muted-foreground">Email Address</p>
                                <p className="font-medium">{employee.email}</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Phone Number</p>
                                <p className="font-medium flex items-center gap-1.5"><Phone size={12} />{employee.contactNumber}</p>
                            </div>
                        </div>
                    </div>

                    <Separator />

                    {/* Assignment Info */}
                    <div>
                        <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                            <Building2 size={16} className="text-primary" /> Assignment Details
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm bg-muted/10 p-4  border border-border/50">
                            <div>
                                <p className="text-xs text-muted-foreground">Department</p>
                                <p className="font-medium">{employee.department}</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Role</p>
                                <p className="font-medium flex items-center gap-1.5"><ShieldCheck size={12} />{employee.role}</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Hire Date</p>
                                <p className="font-medium flex items-center gap-1.5"><CalendarClock size={12} />{employee.hireDate}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter className="p-6 bg-muted/40 border-t border-border shrink-0 flex justify-end gap-3">
                    <Button variant="outline" onClick={() => onOpenChange(false)} className="">
                        Close
                    </Button>
                    {onEdit && (
                        <Button
                            onClick={() => onEdit(employee)}
                            className=" bg-primary text-primary-foreground shadow-lg hover:bg-primary/90"
                        >
                            <Edit size={14} className="mr-2" /> Edit Details
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
