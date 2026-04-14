"use client";

import { AppShell, NavSection } from "@/components/app-shell";
import { PieChart, Package, Trash2, FileBarChart, ShoppingCart, Wrench, TrendingDown, ClipboardList } from "lucide-react";
import { UserRole } from "@/types/asset";

/** Tenant Admins use the same finance module URLs as Finance users (full dashboard + subpages). */
const REQUIRED_ROLES: UserRole[] = ["Finance", "Admin"];

const navSections: NavSection[] = [
    {
        label: "Finance",
        items: [
            { href: "/finance/dashboard", label: "Dashboard", icon: PieChart, allowedRoles: ["Finance"] },
            { href: "/finance/assets", label: "Assets", icon: Package },
            { href: "/finance/disposals", label: "Disposals", icon: Trash2 },
        ],
    },
    {
        label: "Reporting & Procurement",
        items: [
            { href: "/finance/reports", label: "Reports", icon: FileBarChart },
            { href: "/finance/depreciation", label: "Depreciation", icon: TrendingDown },
            { href: "/finance/procurement-approvals", label: "Procurement Approvals", icon: ShoppingCart },
        ],
    },
    {
        label: "Cross-Module",
        items: [
            { href: "/finance/maintenance-requests", label: "Maintenance requests", icon: ClipboardList, allowedRoles: ["Finance"] },
            { href: "/finance/maintenance", label: "Maintenance overview", icon: Wrench },
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
