import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LayoutGrid, QrCode, Search, Package, Printer, Download, Plus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QRCodeSVG } from "qrcode.react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

import { Asset } from "@/types/asset";
import { useAssets } from "@/hooks/use-assets";

interface RegistrationViewProps {
    onRegister?: () => void;
    onManageCategories?: () => void;
    onAssetClick?: (asset: Asset) => void;
}

import { AssetStats } from "@/components/asset-stats";
import { AssetTable } from "@/components/asset-table";

export function RegistrationView({ onRegister, onManageCategories, onAssetClick }: RegistrationViewProps) {
    const { data: assets = [] } = useAssets();
    const [selectedAssetId, setSelectedAssetId] = useState<string>("");
    const [activeTab, setActiveTab] = useState<string>("inventory");

    const selectedAsset = assets.find(a => a.id === selectedAssetId);

    // Filter out archived assets for tagging dropdown
    const activeAssets = assets.filter(a => a.status !== 'Archived');

    return (
        <div className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-8">
                        <TabsList className="grid w-full max-w-[400px] grid-cols-2 h-11">
                            <TabsTrigger value="inventory" className="text-sm">Inventory List</TabsTrigger>
                            <TabsTrigger value="tagging" className="text-sm">Tagging & QR</TabsTrigger>
                        </TabsList>

                        <div className="flex gap-3 w-full lg:w-auto">
                            {onManageCategories && (
                                <Button variant="outline" onClick={onManageCategories} className="h-10 flex-1 lg:flex-none">
                                    <LayoutGrid size={16} className="mr-2" />
                                    Manage Categories
                                </Button>
                            )}
                            <Button onClick={onRegister} className="h-10 flex-1 lg:flex-none">
                                <Plus size={16} className="mr-2" />
                                Register Asset
                            </Button>
                        </div>
                    </div>

                    <TabsContent value="inventory" className="space-y-8 mt-0">
                        <AssetStats />
                        <AssetTable onAssetClick={onAssetClick} />
                    </TabsContent>

                    <TabsContent value="tagging" className="mt-0">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2">
                                <Card className="h-full">
                                    <CardHeader className="pb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2.5 bg-primary/10 rounded-xl">
                                                <QrCode className="h-5 w-5 text-primary" />
                                            </div>
                                            <div>
                                                <CardTitle className="text-lg">Generate Asset Tags</CardTitle>
                                                <CardDescription className="mt-1">Create and print QR codes for inventory tracking</CardDescription>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        <div className="space-y-3">
                                            <Label htmlFor="asset-select">Select Asset to Tag</Label>
                                            <Select value={selectedAssetId} onValueChange={setSelectedAssetId}>
                                                <SelectTrigger id="asset-select" className="h-10">
                                                    <SelectValue placeholder="Search or select an asset..." />
                                                </SelectTrigger>
                                                <SelectContent className="max-h-[300px]">
                                                    {activeAssets.map(asset => (
                                                        <SelectItem key={asset.id} value={asset.id}>
                                                            <span className="font-mono mr-2 text-muted-foreground">{asset.id}</span>
                                                            {asset.desc}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <p className="text-sm text-muted-foreground">
                                                Choose an asset from the inventory to generate its unique QR code tag.
                                            </p>
                                        </div>

                                        {selectedAsset && (
                                            <div className="p-5 bg-muted/30 rounded-xl space-y-4">
                                                <div className="grid grid-cols-2 gap-4 text-sm">
                                                        <div>
                                                            <span className="text-muted-foreground block text-xs font-medium mb-1">Category</span>
                                                            <span className="font-medium">{selectedAsset.categoryName}</span>
                                                        </div>
                                                        <div>
                                                            <span className="text-muted-foreground block text-xs font-medium mb-1">Status</span>
                                                            <Badge variant="outline">{selectedAsset.status}</Badge>
                                                        </div>
                                                        <div className="col-span-2">
                                                            <span className="text-muted-foreground block text-xs font-medium mb-1">Description</span>
                                                            <span className="font-medium">{selectedAsset.desc}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Preview Panel */}
                            <div className="lg:col-span-1">
                                <Card className="h-full flex flex-col">
                                    <CardHeader className="pb-4">
                                         <CardTitle>Tag Preview</CardTitle>
                                    </CardHeader>
                                    <CardContent className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
                                        {selectedAsset ? (
                                            <>
                                                <div className="bg-white p-4 rounded-xl shadow-sm">
                                                    <QRCodeSVG
                                                        value={JSON.stringify({ id: selectedAsset.id, name: selectedAsset.desc })}
                                                        size={160}
                                                        level="H"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <h4 className="font-mono text-xl font-bold tracking-tight text-primary">{selectedAsset.id}</h4>
                                                    <p className="text-sm text-muted-foreground max-w-[200px] mx-auto line-clamp-2">{selectedAsset.desc}</p>
                                                </div>
                                                <div className="w-full pt-4 mt-auto">
                                                    <Button variant="outline" className="w-full" onClick={() => window.print()}>
                                                        <Printer size={16} className="mr-2" /> Print Label
                                                    </Button>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="text-muted-foreground/50 flex flex-col items-center justify-center h-full py-12">
                                                <div className="p-4 bg-muted/30 rounded-2xl mb-4">
                                                    <QrCode size={48} />
                                                </div>
                                                <p className="text-sm font-medium text-foreground">No Asset Selected</p>
                                                <p className="text-sm text-muted-foreground mt-1">Select an asset to generate preview</p>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </TabsContent>
            </Tabs>
        </div >
    );
}
