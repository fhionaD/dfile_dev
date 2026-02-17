"use client";

import { useState } from "react";
import { ProcurementView } from "@/components/procurement-view";
import { AcquisitionModal } from "@/components/modals/acquisition-modal";
import { OrderDetailsModal } from "@/components/modals/order-details-modal";
import { PurchaseOrder, Asset } from "@/types/asset";

export default function ProcurementPage() {
    const [isAcquisitionModalOpen, setIsAcquisitionModalOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
    const [isOrderDetailsOpen, setIsOrderDetailsOpen] = useState(false);

    // Replacement flow state (simplified for now as it's triggered from Maintenance usually)
    const [selectedAssetForReplacement, setSelectedAssetForReplacement] = useState<Asset | null>(null);

    const handleOrderClick = (order: PurchaseOrder) => {
        setSelectedOrder(order);
        setIsOrderDetailsOpen(true);
    };

    return (
        <>
            <ProcurementView
                onNewOrder={() => setIsAcquisitionModalOpen(true)}
                onOrderClick={handleOrderClick}
            />

            <AcquisitionModal
                key={selectedAssetForReplacement ? `acquisition-${selectedAssetForReplacement.id}` : 'acquisition'}
                open={isAcquisitionModalOpen}
                onOpenChange={(open) => {
                    setIsAcquisitionModalOpen(open);
                    if (!open) setSelectedAssetForReplacement(null);
                }}
                replacementAsset={selectedAssetForReplacement}
            />

            <OrderDetailsModal
                open={isOrderDetailsOpen}
                onOpenChange={setIsOrderDetailsOpen}
                order={selectedOrder}
            />
        </>
    );
}
