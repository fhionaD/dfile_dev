"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Legacy URL: older nav sent Admins here (summary-only). Full finance UI is under /finance/*. Static export–safe redirect. */
export default function TenantFinanceLegacyRedirect() {
    const router = useRouter();
    useEffect(() => {
        router.replace("/finance/dashboard");
    }, [router]);
    return (
        <div className="p-6 text-sm text-muted-foreground" role="status">
            Opening finance dashboard…
        </div>
    );
}
