"use client";

import { MaintenanceView } from "@/components/maintenance-view";

/**
 * Static import (not next/dynamic): a dynamic chunk deferred the whole view and delayed
 * the first GET /api/maintenance until after an extra network round-trip for the JS bundle.
 */
export default function MaintenanceDashboardPage() {
    return (
        <div className="space-y-8">
            <MaintenanceView />
        </div>
    );
}
