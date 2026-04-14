"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Standalone module removed: category management lives under Registration & Tagging → Asset Categories. */
export default function TenantAssetCategoriesRedirectPage() {
    const router = useRouter();
    useEffect(() => {
        router.replace("/tenant/inventory?tab=categories");
    }, [router]);
    return (
        <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
            Redirecting to Registration &amp; Tagging…
        </div>
    );
}
