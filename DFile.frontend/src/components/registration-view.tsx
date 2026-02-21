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
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
                        <TabsList className="grid w-full max-w-[400px] grid-cols-2">
                            <TabsTrigger value="inventory">Inventory List</TabsTrigger>
                            <TabsTrigger value="tagging">Tagging & QR</TabsTrigger>
                        </TabsList>

                        <div className="flex gap-2 w-full sm:w-auto">
                            {onManageCategories && (
                                <Button variant="outline" onClick={onManageCategories} className="h-10 text-sm flex-1 sm:flex-none rounded-md">
                                    <LayoutGrid size={16} className="mr-2" />
                                    Manage Categories
                                </Button>
                            )}
                            <Button onClick={onRegister} className="h-10 text-sm bg-primary text-primary-foreground shadow-sm flex-1 sm:flex-none rounded-md">
                                <Plus size={16} className="mr-2" />
                                Register Asset
                            </Button>
                        </div>
                    </div>

                    <TabsContent value="inventory" className="space-y-6 mt-0">
                        <AssetStats />
                        <AssetTable onAssetClick={onAssetClick} />
                    </TabsContent>

                    <TabsContent value="tagging" className="mt-0">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="md:col-span-2">
                                <Card className="border-border  shadow-sm h-full">
                                    <CardHeader className="border-b border-border bg-muted/40 px-6 py-4 rounded-t-xl">
                                        <div className="flex items-center gap-2">
                                            <div className="p-2 bg-primary/10 rounded-lg">
                                                <QrCode className="h-5 w-5 text-primary" />
                                            </div>
                                            <div>
                                                <CardTitle className="text-lg font-semibold">Generate Asset Tags</CardTitle>
                                                <CardDescription className="text-sm text-muted-foreground mt-0.5">Create and print QR codes for inventory tracking</CardDescription>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-6">
                                        <div className="space-y-6">
                                            <div className="space-y-2">
                                                <Label htmlFor="asset-select">Select Asset to Tag</Label>
                                                <Select value={selectedAssetId} onValueChange={setSelectedAssetId}>
                                                    <SelectTrigger id="asset-select" className="h-10 text-sm">
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
                                                <p className="text-xs text-muted-foreground">
                                                    Choose an asset from the inventory to generate its unique QR code tag.
                                                </p>
                                            </div>

                                            {selectedAsset && (
                                                <div className="p-4 bg-muted/20  border border-border/50 space-y-4">
                                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                                        <div>
                                                            <span className="text-muted-foreground block text-xs uppercase tracking-wider mb-1">Category</span>
                                                            <span className="font-medium">{selectedAsset.cat}</span>
                                                        </div>
                                                        <div>
                                                            <span className="text-muted-foreground block text-xs uppercase tracking-wider mb-1">Status</span>
                                                            <Badge variant="outline" className="bg-background">{selectedAsset.status}</Badge>
                                                        </div>
                                                        <div className="col-span-2">
                                                            <span className="text-muted-foreground block text-xs uppercase tracking-wider mb-1">Description</span>
                                                            <span className="font-medium">{selectedAsset.desc}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Preview Panel */}
                            <div className="md:col-span-1">
                                <Card className="border-border  shadow-sm h-full flex flex-col">
                                    <CardHeader className="border-b border-border bg-muted/40 px-6 py-4 rounded-t-xl">
                                         <CardTitle className="text-base font-semibold">Tag Preview</CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-6 flex-1 flex flex-col items-center justify-center text-center space-y-6">
                                        {selectedAsset ? (
                                            <>
                                                <div className="bg-white p-4  border shadow-sm">
                                                    <QRCodeSVG
                                                        value={JSON.stringify({ id: selectedAsset.id, name: selectedAsset.desc })}
                                                        size={160}
                                                        level="H"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <h4 className="font-mono text-xl font-bold tracking-tight text-primary">{selectedAsset.id}</h4>
                                                    <p className="text-xs text-muted-foreground max-w-[200px] mx-auto line-clamp-2">{selectedAsset.desc}</p>
                                                </div>
                                                <div className="flex gap-2 w-full pt-4 mt-auto">
                                                    <Button variant="outline" className="flex-1" onClick={() => window.print()}>
                                                        <Printer size={16} className="mr-2" /> Print Label
                                                    </Button>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="text-muted-foreground/40 flex flex-col items-center justify-center h-full py-12">
                                                <div className="p-4 bg-muted/20 rounded-full mb-4">
                                                    <QrCode size={48} />
                                                </div>
                                                <p className="text-sm font-medium text-foreground">No Asset Selected</p>
                                                <p className="text-xs mt-1">Select an asset to generate preview</p>
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
