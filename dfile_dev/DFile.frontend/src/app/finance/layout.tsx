"use client";

import { AppShell, NavSection } from "@/components/app-shell";
import { PieChart, Package, TrendingDown, Trash2, FileBarChart, ShoppingCart, Wrench } from "lucide-react";
import { UserRole } from "@/types/asset";

const REQUIRED_ROLES: UserRole[] = ["Finance"];

const navSections: NavSection[] = [
    {
        label: "Finance",
        items: [
            { href: "/finance/dashboard", label: "Dashboard", icon: PieChart },
            { href: "/finance/assets", label: "Assets", icon: Package },
            { href: "/finance/depreciation", label: "Depreciation", icon: TrendingDown },
            { href: "/finance/disposals", label: "Disposals", icon: Trash2 },
        ],
    },
    {
        label: "Reporting & Procurement",
        items: [
            { href: "/finance/reports", label: "Reports", icon: FileBarChart },
            { href: "/finance/procurement-approvals", label: "Procurement Approvals", icon: ShoppingCart },
        ],
    },
    {
        label: "Cross-Module",
        items: [
            { href: "/finance/maintenance", label: "Maintenance", icon: Wrench },
        ],
    },
];

export default function FinanceLayout({ children }: { children: React.ReactNode }) {
    return (
        <AppShell
            navSections={navSections}
            requiredRoles={REQUIRED_ROLES}
            homePath="/finance/dashboard"
        >
            {children}
        </AppShell>
    );
}
