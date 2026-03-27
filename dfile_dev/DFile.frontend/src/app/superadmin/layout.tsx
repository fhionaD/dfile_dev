"use client";

import { AppShell, NavSection } from "@/components/app-shell";
import { LayoutDashboard, Building2, ShieldCheck, AlertTriangle, BarChart3, KeyRound, ShieldAlert } from "lucide-react";
import { UserRole } from "@/types/asset";

const REQUIRED_ROLES: UserRole[] = ["Super Admin"];

const navSections: NavSection[] = [
    {
        label: "Platform",
        items: [
            { href: "/superadmin/dashboard",          label: "Dashboard",           icon: LayoutDashboard },
            { href: "/superadmin/tenant-oversight",   label: "Tenant Oversight",    icon: Building2 },
            { href: "/superadmin/audit-center",       label: "Audit Center",        icon: ShieldCheck },
            { href: "/superadmin/risk-monitor",       label: "Risk Monitor",        icon: AlertTriangle },
            { href: "/superadmin/platform-metrics",   label: "Platform Metrics",    icon: BarChart3 },
        ],
    },
    {
        label: "Governance",
        items: [
            { href: "/superadmin/role-templates",     label: "Role Templates",      icon: KeyRound },
            { href: "/superadmin/emergency-controls", label: "Emergency Controls",  icon: ShieldAlert },
        ],
    },
];

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <AppShell
            navSections={navSections}
            requiredRoles={REQUIRED_ROLES}
            homePath="/superadmin/dashboard"
        >
            {children}
        </AppShell>
    );
}
