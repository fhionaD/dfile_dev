import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LayoutGrid, QrCode, Search, Package, Printer, Download, Plus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QRCodeSVG } from "qrcode.react";

import { Asset, Category } from "@/types/asset";

interface RegistrationViewProps {
    assets: Asset[];
    categories: Category[];
    onRegister?: () => void;
    onManageCategories?: () => void;
}

import { AssetStats } from "@/components/asset-stats";
import { AssetTable } from "@/components/asset-table";
import { Filter, Calendar as CalendarIcon } from "lucide-react";

// ... existing imports

export function RegistrationView({ assets, categories, onRegister, onManageCategories, onAssetClick }: RegistrationViewProps & { onAssetClick?: (asset: Asset) => void }) {
    const [selectedAssetId, setSelectedAssetId] = useState<string>("");
    const [activeTab, setActiveTab] = useState<string>("inventory"); // Default to inventory list

    // Filter States
    const [searchQuery, setSearchQuery] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("All");
    const [statusFilter, setStatusFilter] = useState("All");
    const [dateFilter, setDateFilter] = useState("All Time");

    const selectedAsset = assets.find(a => a.id === selectedAssetId);



    // Filter Logic
    const filteredAssets = assets.filter(asset => {
        // 1. Text Search
        const query = searchQuery.toLowerCase();
        const matchesSearch =
            asset.id.toLowerCase().includes(query) ||
            asset.desc.toLowerCase().includes(query) ||
            (asset.serialNumber && asset.serialNumber.toLowerCase().includes(query)) ||
            (asset.model && asset.model.toLowerCase().includes(query));

        if (!matchesSearch) return false;

        // 2. Category Filter
        if (categoryFilter !== "All" && asset.cat !== categoryFilter) return false;

        // 3. Status Filter
        if (statusFilter !== "All" && asset.status !== statusFilter) return false;

        // 4. Date Filter (Purchase Date)
        if (dateFilter !== "All Time") {
            if (!asset.purchaseDate) return false;

            const date = new Date(asset.purchaseDate);
            const now = new Date();

            if (dateFilter === "This Month") {
                return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
            }
            if (dateFilter === "This Year") {
                return date.getFullYear() === now.getFullYear();
            }
        }

        return true;
    });

    return (
        <div className="max-w-6xl mx-auto">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <TabsList className="grid w-full max-w-[400px] grid-cols-2 bg-muted/50 p-1 rounded-xl">
                        <TabsTrigger value="inventory" className="rounded-lg">Inventory List</TabsTrigger>
                        <TabsTrigger value="tagging" className="rounded-lg">Tagging & QR</TabsTrigger>
                    </TabsList>

                    <div className="flex gap-2 w-full sm:w-auto">
                        {onManageCategories && (
                            <Button variant="outline" onClick={onManageCategories} className="h-9 text-xs flex-1 sm:flex-none">
                                <LayoutGrid size={14} className="mr-2" />
                                Manage Categories
                            </Button>
                        )}
                        <Button onClick={onRegister} className="h-9 text-xs bg-primary text-primary-foreground shadow-sm flex-1 sm:flex-none">
                            <Plus size={14} className="mr-2" />
                            Register Asset
                        </Button>
                    </div>
                </div>

                <TabsContent value="inventory" className="space-y-6">
                    <AssetStats assets={assets} />
                    <AssetTable assets={assets} onAssetClick={onAssetClick} />
                </TabsContent>

                <TabsContent value="tagging">
                    {/* ... existing content ... */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-2 border border-border rounded-2xl overflow-hidden bg-card p-6 min-h-[400px]">
                            <h3 className="text-lg font-semibold text-foreground mb-4">Generate Asset Tags</h3>
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-muted-foreground">Select Asset to Tag</label>
                                    <Select value={selectedAssetId} onValueChange={setSelectedAssetId}>
                                        <SelectTrigger className="h-11">
                                            <SelectValue placeholder="Search or select an asset..." />
                                        </SelectTrigger>
                                        <SelectContent className="max-h-[300px]">
                                            {assets.map(asset => (
                                                <SelectItem key={asset.id} value={asset.id}>
                                                    <span className="font-mono mr-2 text-muted-foreground">{asset.id}</span>
                                                    {asset.desc}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground">
                                        Choose an asset from the inventory to generate its unique QR code tag.
                                    </p>
                                </div>

                                {selectedAsset && (
                                    <div className="p-4 bg-muted/20 rounded-xl border border-border/50 space-y-4">
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <span className="text-muted-foreground block text-xs">Category</span>
                                                <span className="font-medium">{selectedAsset.cat}</span>
                                            </div>
                                            <div>
                                                <span className="text-muted-foreground block text-xs">Status</span>
                                                <span className="font-medium">{selectedAsset.status}</span>
                                            </div>
                                            <div className="col-span-2">
                                                <span className="text-muted-foreground block text-xs">Description</span>
                                                <span className="font-medium">{selectedAsset.desc}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Preview Panel */}
                        <div className="border border-border rounded-2xl overflow-hidden bg-card p-6 flex flex-col items-center justify-center text-center space-y-6">
                            {selectedAsset ? (
                                <>
                                    <div className="bg-white p-4 rounded-xl border shadow-sm">
                                        <QRCodeSVG
                                            value={JSON.stringify({ id: selectedAsset.id, name: selectedAsset.desc })}
                                            size={160}
                                            level="H"
                                        />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-lg">{selectedAsset.id}</h4>
                                        <p className="text-xs text-muted-foreground">{selectedAsset.desc}</p>
                                    </div>
                                    <div className="flex gap-2 w-full">
                                        <Button variant="outline" className="flex-1" onClick={() => window.print()}>
                                            <Printer size={16} className="mr-2" /> Print
                                        </Button>
                                    </div>
                                </>
                            ) : (
                                <div className="text-muted-foreground opacity-50">
                                    <QrCode size={64} className="mx-auto mb-4" />
                                    <p className="text-sm">Select an asset to view tag</p>
                                </div>
                            )}
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div >
    );
}
