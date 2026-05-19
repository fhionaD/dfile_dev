"use client";

import { AppShell, NavSection } from "@/components/app-shell";
import {
    LayoutDashboard,
    Package,
    Trash2,
    ArrowLeftRight,
    MapPin,
    Wrench,
    PieChart,
    ClipboardList,
    CreditCard,
    Users,
    ListChecks,
} from "lucide-react";
import { UserRole } from "@/types/asset";

const REQUIRED_ROLES: UserRole[] = ["Admin"];

const navSections: NavSection[] = [
    {
        label: "Organization",
        items: [
            { href: "/tenant/dashboard",          label: "Dashboard",              icon: LayoutDashboard },
            { href: "/tenant/users",             label: "Users",                  icon: Users },
            { href: "/tenant/billing",           label: "Billing",                icon: CreditCard },
            { href: "/tenant/audit-logs",         label: "Audit Logs",             icon: ClipboardList },
        ],
    },
    {
        label: "Asset Management",
        items: [
            { href: "/tenant/inventory",          label: "Registration & Tagging", icon: Package },
            { href: "/tenant/allocation",         label: "Allocation",             icon: ArrowLeftRight },
            { href: "/tenant/disposals",         label: "Disposals",              icon: Trash2 },
        ]
    },
    {
        label: "Configuration",
        items: [
            { href: "/tenant/locations",          label: "Locations",              icon: MapPin },
        ],
    },
    {
        label: "Cross-Module",
        items: [
            { href: "/tenant/maintenance",        label: "Maintenance",            icon: Wrench },
            { href: "/finance/dashboard",         label: "Finance Dashboard",      icon: PieChart, allowedRoles: ["Finance"] },
            { href: "/finance/maintenance-requests", label: "Maintenance requests", icon: ListChecks, allowedRoles: ["Finance"] },
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
