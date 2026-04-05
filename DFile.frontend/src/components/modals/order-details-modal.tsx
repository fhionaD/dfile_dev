"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusText } from "@/components/ui/status-text";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ShoppingCart, PhilippinePeso, Calendar, Building2, User, Package, TrendingDown } from "lucide-react";
import { PurchaseOrder } from "@/types/asset";
import { useReceiveOrder } from "@/hooks/use-procurement";

interface OrderDetailsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    order: PurchaseOrder | null;
}

function toDateInputValue(d: Date) {
    return d.toISOString().slice(0, 10);
}

const statusVariant: Record<string, "warning" | "info" | "success" | "danger"> = {
    Pending: "warning",
    Approved: "info",
    Delivered: "success",
    Cancelled: "danger",
};

export function OrderDetailsModal({ open, onOpenChange, order }: OrderDetailsModalProps) {
    const receiveOrder = useReceiveOrder();
    const [deliveryDate, setDeliveryDate] = useState(() => toDateInputValue(new Date()));

    useEffect(() => {
        if (open && order) {
            setDeliveryDate(toDateInputValue(new Date()));
        }
    }, [open, order?.id]);

    if (!order) return null;

    const monthlyDep = order.usefulLifeYears > 0
        ? order.purchasePrice / (order.usefulLifeYears * 12)
        : 0;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg rounded-2xl border-border p-0 overflow-hidden flex flex-col max-h-[85vh]">
                <DialogHeader className="p-6 bg-muted/40 border-b border-border shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12  bg-primary/10 flex items-center justify-center text-primary">
                            <ShoppingCart size={24} />
                        </div>
                        <div>
                            <DialogTitle className="text-lg font-semibold text-foreground">{order.assetName}</DialogTitle>
                            <div className="flex items-center gap-2 mt-1.5">
                                <Badge variant="secondary" className="font-mono text-xs">{order.id}</Badge>
                                <Badge variant="outline" className="text-xs">{order.category}</Badge>
                                <StatusText variant={statusVariant[order.status] ?? "muted"}>{order.status}</StatusText>
                            </div>
                        </div>
                    </div>
                    <DialogDescription className="sr-only">Purchase order details for {order.assetName}</DialogDescription>
                </DialogHeader>

                <div className="p-6 space-y-5 flex-1 overflow-y-auto">
                    {/* Financial */}
                    <div>
                        <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                            <PhilippinePeso size={16} className="text-primary" /> Financial Details
                        </h4>
                        <div className="grid grid-cols-2 gap-4 text-sm bg-muted/10 p-4  border border-border/50">
                            <div>
                                <p className="text-xs text-muted-foreground">Purchase Price</p>
                                <p className="font-semibold text-lg">₱{order.purchasePrice.toLocaleString()}</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Monthly Depreciation</p>
                                <p className="font-medium flex items-center gap-1.5"><TrendingDown size={12} />₱{monthlyDep.toFixed(2)}</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Useful Life</p>
                                <p className="font-medium">{order.usefulLifeYears} year{order.usefulLifeYears !== 1 ? "s" : ""}</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Purchase Date</p>
                                <p className="font-medium">{order.purchaseDate}</p>
                            </div>
                        </div>
                    </div>

                    <Separator />

                    {/* Asset & Vendor */}
                    <div>
                        <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                            <Package size={16} className="text-primary" /> Asset & Vendor Info
                        </h4>
                        <div className="grid grid-cols-2 gap-4 text-sm bg-muted/10 p-4  border border-border/50">
                            <div>
                                <p className="text-xs text-muted-foreground">Vendor</p>
                                <p className="font-medium flex items-center gap-1.5"><Building2 size={12} />{order.vendor || "—"}</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Manufacturer</p>
                                <p className="font-medium">{order.manufacturer || "—"}</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Model</p>
                                <p className="font-medium">{order.model || "—"}</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Serial Number</p>
                                <p className="font-mono text-xs">{order.serialNumber || "—"}</p>
                            </div>
                        </div>
                    </div>

                    <Separator />

                    {/* Request Info */}
                    <div>
                        <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                            <User size={16} className="text-primary" /> Request Details
                        </h4>
                        <div className="grid grid-cols-2 gap-4 text-sm bg-muted/10 p-4  border border-border/50">
                            <div>
                                <p className="text-xs text-muted-foreground">Requested By</p>
                                <p className="font-medium">{order.requestedBy}</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">Created At</p>
                                <p className="font-medium">{order.createdAt}</p>
                            </div>
                            {order.assetId && (
                                <div>
                                    <p className="text-xs text-muted-foreground">Linked Asset</p>
                                    <Badge variant="secondary" className="font-mono text-xs mt-1">{order.assetId}</Badge>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {order.status === "Approved" && !order.assetId && (
                    <div className="px-6 pb-2 space-y-3 border-t border-border pt-4">
                        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                            <Package size={16} className="text-primary" /> Receive &amp; create asset
                        </h4>
                        <p className="text-xs text-muted-foreground">
                            Confirms delivery and registers an asset linked to this PO. Ensure line items include a category or the PO category matches an asset category name.
                        </p>
                        <div className="space-y-1.5 max-w-xs">
                            <Label htmlFor="po-delivery-date">Delivery date</Label>
                            <Input
                                id="po-delivery-date"
                                type="date"
                                value={deliveryDate}
                                max={toDateInputValue(new Date())}
                                onChange={(e) => setDeliveryDate(e.target.value)}
                            />
                        </div>
                        <Button
                            type="button"
                            disabled={receiveOrder.isPending}
                            onClick={() => {
                                void (async () => {
                                    try {
                                        await receiveOrder.mutateAsync({
                                            id: order.id,
                                            deliveryDate: new Date(deliveryDate + "T12:00:00.000Z").toISOString(),
                                        });
                                        onOpenChange(false);
                                    } catch {
                                        /* toast handled in hook */
                                    }
                                })();
                            }}
                        >
                            {receiveOrder.isPending ? "Receiving…" : "Receive order"}
                        </Button>
                    </div>
                )}

                <DialogFooter className="p-6 bg-muted/40 border-t border-border shrink-0 flex justify-end gap-3">
                    <Button onClick={() => onOpenChange(false)} className=" bg-primary text-primary-foreground shadow-lg hover:bg-primary/90">
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
