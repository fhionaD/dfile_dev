"use client";

import { useState, useEffect } from "react";
import { MoreHorizontal, Search, Shield, UserX, UserCheck, Archive, Filter, Building2, RotateCcw, Edit, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { EditTenantModal } from "./modals/edit-tenant-modal";
import { TenantDetailsModal } from "./modals/tenant-details-modal";

// Define local interface if not yet in types
interface TenantDto {
    id: number;
    name: string;
    subscriptionPlan: number; // enum
    maxRooms: number;
    maxPersonnel: number;
    createdAt: string;
    status: string;
}

export function TenantList() {
    const [tenants, setTenants] = useState<TenantDto[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [showArchived, setShowArchived] = useState(false);
    
    // Modals State
    const [selectedTenant, setSelectedTenant] = useState<TenantDto | null>(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const fetchTenants = async () => {
        try {
            const res = await fetch('/api/tenants');
            if (res.ok) {
                const data = await res.json();
                setTenants(data);
            }
        } catch (error) {
            console.error("Failed to fetch tenants", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchTenants();
    }, []);

    // Placeholder for status update API call
    const updateTenantStatus = async (id: number, status: string) => {
        try {
            const res = await fetch(`/api/tenants/${id}/status`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ status })
            });

            if (res.ok) {
                // Update local state
                setTenants(prev => prev.map(t => t.id === id ? { ...t, status } : t));
            } else {
                const errorText = await res.text();
            }
        } catch (error) {
            // console.error("Error updating status:", error);
        }
        // Optimistic update anyway for demo
        setTenants(prev => prev.map(t => t.id === id ? { ...t, status } : t));
    };

    const handleRowClick = (tenant: TenantDto) => {
        setSelectedTenant(tenant);
        setIsDetailsModalOpen(true);
    };
    
    const handleEditFromDetails = () => {
        setIsDetailsModalOpen(false);
        setIsEditModalOpen(true);
    };

    const handleSave = (updatedTenant: TenantDto) => {
        // Update local state
        setTenants(prev => prev.map(t => t.id === updatedTenant.id ? updatedTenant : t));
        setIsEditModalOpen(false);
        setSelectedTenant(null);
    };

    const filteredTenants = tenants.filter(t => {
        // Search
        if (searchQuery && !t.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        
        // Status Filter
        if (statusFilter !== "All" && t.status !== statusFilter) return false;
        
        // Archive Filter - Toggle between Active and Archived/Inactive
        if (showArchived) {
            // Show ONLY Archived/Inactive
            if (t.status !== "Archived" && t.status !== "Inactive") return false;
        } else {
            // Show ONLY Active (Hide Archived/Inactive)
            if (t.status === "Archived" || t.status === "Inactive") return false;
        }
        
        return true;
    });

    const getPlanName = (plan: number) => {
        switch(plan) {
            case 0: return "Starter";
            case 1: return "Basic";
            case 2: return "Pro";
            default: return "Unknown";
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h3 className="text-2xl font-bold tracking-tight text-foreground">Registered Organizations</h3>
                <p className="text-muted-foreground">Manage organization access and subscriptions</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-background p-1 rounded-lg">
                <div className="flex flex-1 gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0 items-center">
                    <div className="relative flex-1 max-w-sm min-w-[200px]">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search organizations..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 h-10 bg-background text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[180px] h-10 bg-background text-sm">
                            <div className="flex items-center gap-2">
                                <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                                <SelectValue placeholder="Status" />
                            </div>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="All">All Status</SelectItem>
                            <SelectItem value="Active">Active</SelectItem>
                            <SelectItem value="Inactive">Inactive</SelectItem>
                            <SelectItem value="Archived">Archived</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <Button 
                        variant={showArchived ? "default" : "outline"}
                        size="sm" 
                        className="h-10 px-4 text-sm w-[160px] justify-start"
                        onClick={() => setShowArchived(!showArchived)}
                    >
                        {showArchived ? (
                            <><RotateCcw size={16} className="mr-2" />Show Active ({tenants.filter(t => t.status !== "Inactive" && t.status !== "Archived").length})</>
                        ) : (
                            <><Archive size={16} className="mr-2" />Show Archive ({tenants.filter(t => t.status === "Inactive" || t.status === "Archived").length})</>
                        )}
                    </Button>
                </div>
            </div>

            <Card className="border-border shadow-sm  overflow-hidden">
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table className="w-full table-fixed">
                    <TableHeader>
                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                            <TableHead className="px-4 py-3 align-middle text-xs font-medium text-muted-foreground w-[250px] text-left">Organization</TableHead>
                            <TableHead className="px-4 py-3 align-middle text-xs font-medium text-muted-foreground text-left w-[20%]">Subscription</TableHead>
                            <TableHead className="px-4 py-3 align-middle text-xs font-medium text-muted-foreground text-right w-[15%]">Limits (Rooms/Staff)</TableHead>
                            <TableHead className="px-4 py-3 align-middle text-xs font-medium text-muted-foreground text-center w-[120px]">Created</TableHead>
                            <TableHead className="px-4 py-3 align-middle text-xs font-medium text-muted-foreground text-center w-[100px]">Status</TableHead>
                            <TableHead className="px-4 py-3 align-middle text-xs font-medium text-muted-foreground text-center w-[100px]">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center py-8">
                                    Loading tenants...
                                </TableCell>
                            </TableRow>
                        ) : filteredTenants.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center py-8 text-muted-foreground">
                                    {showArchived ? "No archived organizations yet" : "No organizations match your search"}
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredTenants.map((tenant) => (
                                <TableRow 
                                    key={tenant.id} 
                                    className="hover:bg-muted/30 transition-colors cursor-pointer border-b border-border last:border-0"
                                    onClick={() => handleRowClick(tenant)}
                                >
                                    <TableCell className="px-4 py-3 align-middle font-normal">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-normal text-foreground">{tenant.name}</span>
                                            <span className="text-xs text-muted-foreground">ID: {tenant.id}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="px-4 py-3 align-middle text-left">
                                        <span className="text-sm font-normal text-muted-foreground">
                                            {getPlanName(tenant.subscriptionPlan)}
                                        </span>
                                    </TableCell>
                                    <TableCell className="px-4 py-3 align-middle text-sm text-muted-foreground text-right">
                                        {tenant.maxRooms} / {tenant.maxPersonnel}
                                    </TableCell>
                                    <TableCell className="px-4 py-3 align-middle text-sm text-muted-foreground text-center">
                                        {new Date(tenant.createdAt).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell className="px-4 py-3 align-middle text-center">
                                        <span 
                                            className={`text-sm font-normal inline-block
                                                ${tenant.status === 'Active' ? 'text-emerald-700 dark:text-emerald-400' : 
                                                  tenant.status === 'Inactive' ? 'text-amber-700 dark:text-amber-400' :
                                                  'text-gray-700 dark:text-gray-400'}
                                            `}
                                        >
                                            {tenant.status || 'Active'}
                                        </span>
                                    </TableCell>
                                    <TableCell className="px-4 py-3 align-middle text-center" onClick={(e) => e.stopPropagation()}>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const newStatus = (tenant.status === 'Archived' || tenant.status === 'Inactive') ? 'Active' : 'Archived';
                                                updateTenantStatus(tenant.id, newStatus);
                                            }}
                                            title={(tenant.status === 'Archived' || tenant.status === 'Inactive') ? "Recall / Restore" : "Archive Association"}
                                        >
                                            {(tenant.status === 'Archived' || tenant.status === 'Inactive') ? (
                                                <RotateCcw className="h-4 w-4" />
                                            ) : (
                                                <Archive className="h-4 w-4" />
                                            )}
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
            {/* Simple Pagination Mock - To match AssetTable look */}
            <div className="p-4 border-t border-border flex items-center justify-between bg-muted/20">
                <div className="text-xs text-muted-foreground font-normal">
                    Showing {filteredTenants.length} tenants
                </div>
            </div>
                </CardContent>
            </Card>

            {/* View Details Modal */}
            <TenantDetailsModal 
                open={isDetailsModalOpen} 
                onOpenChange={setIsDetailsModalOpen} 
                tenant={selectedTenant}
                onEdit={handleEditFromDetails}
            />

            {/* Edit Modal (Reused) */}
            <EditTenantModal 
                open={isEditModalOpen} 
                onOpenChange={setIsEditModalOpen} 
                tenant={selectedTenant} 
                onSave={handleSave} 
            />
        </div>
    );
}
