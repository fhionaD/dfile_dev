"use client";

import { useState } from "react";
import { Plus, Archive, RotateCcw, Edit3, MoreHorizontal, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useCategories, useAddCategory, useUpdateCategory, useArchiveCategory, useRestoreCategory } from "@/hooks/use-categories";
import { ManageCategoriesModal } from "@/components/modals/manage-categories-modal";
import { Category } from "@/types/asset";

export default function AssetCategoriesPage() {
    const router = useRouter();
    const { data: categories = [], isLoading } = useCategories(true); // Fetch all including archived
    const addCategoryMutation = useAddCategory();
    const updateCategoryMutation = useUpdateCategory();
    const archiveCategoryMutation = useArchiveCategory();
    const restoreCategoryMutation = useRestoreCategory();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    const filteredCategories = categories.filter(c => 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        c.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h2 className="text-2xl font-semibold tracking-tight">Asset Categories</h2>
                    <p className="text-sm text-muted-foreground">
                        Manage classification categories for your physical assets
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => router.push("/dashboard/inventory")}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Inventory
                    </Button>
                    <Button onClick={() => setIsModalOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        New Category
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle>Categories</CardTitle>
                            <CardDescription>List of all asset categories in the system</CardDescription>
                        </div>
                        <div className="w-[300px]">
                            <Input 
                                placeholder="Search categories..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Handling</TableHead>
                                <TableHead>Items</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="w-[80px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8">Loading categories...</TableCell>
                                </TableRow>
                            ) : filteredCategories.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No categories found</TableCell>
                                </TableRow>
                            ) : (
                                filteredCategories.map((category) => (
                                    <TableRow key={category.id} className={category.isArchived ? "opacity-60 bg-muted/30" : ""}>
                                        <TableCell className="font-medium">{category.name}</TableCell>
                                        <TableCell>{category.description}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{category.handlingType}</Badge>
                                        </TableCell>
                                        <TableCell>{category.items} items</TableCell>
                                        <TableCell>
                                            <Badge variant={category.isArchived ? "secondary" : "default"}>
                                                {category.isArchived ? "Archived" : "Active"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => setIsModalOpen(true)}>
                                                        <Edit3 className="mr-2 h-4 w-4" />
                                                        Edit
                                                    </DropdownMenuItem>
                                                    {category.isArchived ? (
                                                        <DropdownMenuItem onClick={() => restoreCategoryMutation.mutate(category.id)}>
                                                            <RotateCcw className="mr-2 h-4 w-4" />
                                                            Restore
                                                        </DropdownMenuItem>
                                                    ) : (
                                                        <DropdownMenuItem onClick={() => archiveCategoryMutation.mutate(category.id)} className="text-destructive">
                                                            <Archive className="mr-2 h-4 w-4" />
                                                            Archive
                                                        </DropdownMenuItem>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Reuse the existing modal manager for simplicity, or create a specific edit modal if preferred */}
            <ManageCategoriesModal
                open={isModalOpen}
                onOpenChange={setIsModalOpen}
                categories={categories}
                onAddCategory={(cat) => addCategoryMutation.mutate(cat)}
                onUpdateCategory={(id, data) => {
                    const existing = categories.find(c => c.id === id);
                    if (existing) {
                        updateCategoryMutation.mutate({ ...existing, ...data } as Category);
                    }
                }}
                onArchiveCategory={(id) => archiveCategoryMutation.mutate(id)}
            />
        </div>
    );
}
