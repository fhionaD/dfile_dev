"use client";

import { AssetCategoriesSection } from "@/components/asset-categories-section";

/** Same UI as Registration & Tagging → Asset Categories (shared component). */
export default function AssetCategoriesPage() {
    return (
        <div className="space-y-6">
            <AssetCategoriesSection />
        </div>
    );
}
