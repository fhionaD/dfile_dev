"use client";

import { AppShell, NavSection } from "@/components/app-shell";
import { LayoutDashboard, Building2, QrCode, ArrowLeftRight, MapPin, Tag, ShoppingCart, Wrench, PieChart } from "lucide-react";
import { UserRole } from "@/types/asset";

const REQUIRED_ROLES: UserRole[] = ["Admin"];

const navSections: NavSection[] = [
    {
        label: "Organization",
        items: [
            { href: "/tenant/dashboard",          label: "Dashboard",              icon: LayoutDashboard },
            { href: "/tenant/organization",       label: "Organization Structure", icon: Building2 },
        ],
    },
    {
        label: "Asset Management",
        items: [
            { href: "/tenant/inventory",          label: "Registration & Tagging", icon: QrCode },
            { href: "/tenant/allocation",         label: "Allocation",             icon: ArrowLeftRight },
        ]
    },
    {
        label: "Configuration",
        items: [
            { href: "/tenant/locations",          label: "Locations",              icon: MapPin },
            { href: "/tenant/asset-categories",   label: "Asset Categories",       icon: Tag },
        ],
    },
    {
        label: "Procurement",
        items: [
            { href: "/tenant/procurement",        label: "Purchase Orders",        icon: ShoppingCart },
        ],
    },
    {
        label: "Cross-Module",
        items: [
            { href: "/tenant/maintenance",        label: "Maintenance",            icon: Wrench },
            { href: "/tenant/finance",            label: "Finance Overview",       icon: PieChart },
        ],
    },
];

export default function TenantLayout({ children }: { children: React.ReactNode }) {
    return (
        <AppShell
            navSections={navSections}
            requiredRoles={REQUIRED_ROLES}
            homePath="/tenant/dashboard"
        >
            {children}
        </AppShell>
    );
}
