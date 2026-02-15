"use client";

import { useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Share2, Printer } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Asset } from "@/types/asset";

interface QRCodeModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    asset: Asset | null;
}

export function QRCodeModal({ open, onOpenChange, asset }: QRCodeModalProps) {
    if (!asset) return null;

    // Unique data for the QR Code
    const qrData = JSON.stringify({
        id: asset.id,
        name: asset.desc,
        category: asset.cat,
        status: asset.status,
        manufacturer: asset.manufacturer,
        model: asset.model,
        serial: asset.serialNumber
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl rounded-2xl border-border p-0 overflow-hidden">
                <DialogTitle className="sr-only">Asset QR Code</DialogTitle>
                <div className="flex flex-row bg-white overflow-hidden printable-sticker w-full">
                    {/* Left Side: QR Code */}
                    <div className="shrink-0 p-6 flex flex-col items-center justify-center bg-white border-r border-border/50 w-[240px]">
                        <div className="p-3 bg-white rounded-xl shadow-sm border border-border/50">
                            <QRCodeSVG
                                id="asset-qr-code"
                                value={qrData}
                                size={160}
                                level="H"
                                includeMargin={true}
                            />
                        </div>
                        <div className="mt-3 text-center">
                            <h3 className="text-xs font-bold text-foreground">SCAN ME</h3>
                            <p className="text-[9px] text-muted-foreground uppercase tracking-widest">or visit dfile.app</p>
                        </div>
                    </div>

                    {/* Right Side: Details */}
                    <div className="flex-1 p-6 flex flex-col justify-center space-y-4">
                        <div>
                            <h2 className="text-2xl font-bold text-foreground leading-tight">{asset.desc}</h2>
                            <div className="flex items-center gap-2 mt-2">
                                <span className="font-mono text-base font-semibold bg-primary/10 text-primary px-3 py-1 rounded-md">
                                    {asset.id}
                                </span>
                                <span className="text-xs uppercase font-bold tracking-wider text-muted-foreground border border-border px-2 py-1 rounded-md">
                                    {asset.cat}
                                </span>
                            </div>
                        </div>

                        <div className="space-y-1 pt-2 border-t border-border/50">
                            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
                                <div className="text-muted-foreground font-medium">Manufacturer</div>
                                <div className="font-semibold text-foreground">{asset.manufacturer || "—"}</div>

                                <div className="text-muted-foreground font-medium">Model</div>
                                <div className="font-semibold text-foreground">{asset.model || "—"}</div>

                                <div className="text-muted-foreground font-medium">Serial No.</div>
                                <div className="font-mono text-foreground">{asset.serialNumber || "—"}</div>

                                <div className="text-muted-foreground font-medium">Purchase Date</div>
                                <div className="font-medium text-foreground">{asset.purchaseDate || "—"}</div>
                            </div>
                        </div>

                        <div className="pt-4 mt-auto">
                            <div className="flex items-center gap-2">
                                <div className="h-6 w-6 rounded-md bg-primary flex items-center justify-center text-primary-foreground font-bold text-xs">
                                    D
                                </div>
                                <span className="font-bold text-sm tracking-tight text-foreground">DFILE Asset Management</span>
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter className="p-6 bg-muted/40 border-t border-border flex justify-end print:hidden">
                    <Button onClick={() => window.print()} className="rounded-xl bg-primary text-primary-foreground px-8 shadow-sm">
                        <Printer size={16} className="mr-2" /> Print
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
