"use client";

import { AppShell, NavSection } from "@/components/app-shell";
import {
    LayoutDashboard,
    Building2,
    Package,
    ArrowLeftRight,
    MapPin,
    ShoppingCart,
    Wrench,
    PieChart,
    ClipboardList,
    CheckCircle2,
    CreditCard,
    Users,
    Shield,
    Tag,
    Briefcase,
    ListChecks,
} from "lucide-react";
import { UserRole } from "@/types/asset";

const REQUIRED_ROLES: UserRole[] = ["Admin"];

const navSections: NavSection[] = [
    {
        label: "Organization",
        items: [
            { href: "/tenant/dashboard",          label: "Dashboard",              icon: LayoutDashboard },
            { href: "/tenant/organization",       label: "Organization Structure", icon: Building2 },
            { href: "/tenant/departments",       label: "Departments",            icon: Briefcase },
            { href: "/tenant/users",             label: "Users",                  icon: Users },
            { href: "/tenant/roles",             label: "Roles",                  icon: Shield },
            { href: "/tenant/billing",           label: "Billing",                icon: CreditCard },
            { href: "/tenant/audit-logs",         label: "Audit Logs",             icon: ClipboardList },
        ],
    },
    {
        label: "Asset Management",
        items: [
            { href: "/tenant/inventory",          label: "Registration & Tagging", icon: Package },
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
            { href: "/tenant/tasks",              label: "Tasks",                  icon: CheckCircle2 },
            { href: "/tenant/maintenance",        label: "Maintenance",            icon: Wrench },
            { href: "/finance/dashboard",         label: "Finance Dashboard",      icon: PieChart },
            { href: "/finance/maintenance-requests", label: "Maintenance requests", icon: ListChecks },
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
