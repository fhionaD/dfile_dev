"use client";

import { AppShell, NavSection } from "@/components/app-shell";
import { MaintenanceSettingsProvider } from "@/contexts/maintenance-context";
import { LayoutDashboard, CalendarClock, HeartPulse, PieChart } from "lucide-react";
import { UserRole } from "@/types/asset";

const REQUIRED_ROLES: UserRole[] = ["Maintenance"];

const navSections: NavSection[] = [
    {
        label: "Maintenance",
        items: [
            { href: "/maintenance/dashboard",       label: "Dashboard",        icon: LayoutDashboard },
            { href: "/maintenance/schedules",       label: "Schedules",        icon: CalendarClock },
            { href: "/maintenance/asset-condition",  label: "Asset Condition",  icon: HeartPulse },
        ],
    },
    {
        label: "Cross-Module",
        items: [
            { href: "/maintenance/finance",         label: "Finance Overview", icon: PieChart },
        ],
    },
];

export default function MaintenanceLayout({ children }: { children: React.ReactNode }) {
    return (
        <MaintenanceSettingsProvider>
            <AppShell
                navSections={navSections}
                requiredRoles={REQUIRED_ROLES}
                homePath="/maintenance/dashboard"
            >
                {children}
            </AppShell>
        </MaintenanceSettingsProvider>
    );
}
