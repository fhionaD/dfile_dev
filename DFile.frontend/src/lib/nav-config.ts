import {
    LayoutDashboard, Building2, MapPin, ShoppingCart, Package, ArrowRightLeft,
    PieChart, TrendingDown, Trash2, FileBarChart, CreditCard,
    Wrench, CalendarClock, HeartPulse,
    ShieldCheck, AlertTriangle, BarChart3, KeyRound, ShieldAlert, CheckCircle2, ClipboardList,
} from "lucide-react";
import type { UserRole } from "@/types/asset";

export interface PermNavItem {
    href: string;
    label: string;
    icon: React.ElementType;
    requiredModules?: string[];
    /** When set, the item is shown only if the signed-in user's role is in this list (after module checks). */
    allowedRoles?: UserRole[];
}

export interface PermNavSection {
    label: string;
    items: PermNavItem[];
}

const TENANT_NAV: PermNavSection[] = [
    {
        label: "Organization",
        items: [
            { href: "/tenant/dashboard", label: "Dashboard", icon: LayoutDashboard },
            { href: "/tenant/organization", label: "Organization Structure", icon: Building2, requiredModules: ["Departments", "Employees"] },
            { href: "/tenant/departments", label: "Departments", icon: Building2, requiredModules: ["Departments"] },
            { href: "/tenant/users", label: "Users", icon: Building2, requiredModules: ["Employees"] },
            { href: "/tenant/roles", label: "Roles", icon: KeyRound, requiredModules: ["Employees"] },
            { href: "/tenant/billing", label: "Billing", icon: CreditCard },
            { href: "/tenant/audit-logs", label: "Audit Logs", icon: ClipboardList, requiredModules: ["Reports"] },
        ],
    },
    {
        label: "Asset Management",
        items: [
            { href: "/tenant/inventory", label: "Registration & Tagging", icon: Package, requiredModules: ["Assets"] },
            { href: "/tenant/allocation", label: "Allocation", icon: ArrowRightLeft, requiredModules: ["Assets"] },
            { href: "/tenant/disposals", label: "Disposals", icon: Trash2, requiredModules: ["Assets"] },
        ],
    },
    {
        label: "Configuration",
        items: [
            { href: "/tenant/locations", label: "Locations", icon: MapPin, requiredModules: ["Rooms"] },
        ],
    },
    {
        label: "Procurement",
        items: [
            { href: "/tenant/procurement", label: "Purchase Orders", icon: ShoppingCart, requiredModules: ["PurchaseOrders"] },
        ],
    },
    {
        label: "Operations",
        items: [
            { href: "/tenant/tasks", label: "Tasks", icon: CheckCircle2, requiredModules: ["Tasks"] },
        ],
    },
    {
        label: "Finance",
        items: [
            { href: "/finance/dashboard", label: "Finance Dashboard", icon: PieChart, requiredModules: ["Assets"], allowedRoles: ["Finance"] },
            { href: "/finance/assets", label: "Assets", icon: Package, requiredModules: ["Assets"] },
            { href: "/finance/depreciation", label: "Depreciation", icon: TrendingDown, requiredModules: ["Assets"] },
            { href: "/finance/disposals", label: "Disposals", icon: Trash2, requiredModules: ["Assets"] },
            { href: "/finance/reports", label: "Reports", icon: FileBarChart, requiredModules: ["Reports"] },
            { href: "/finance/procurement-approvals", label: "Procurement Approvals", icon: ShoppingCart, requiredModules: ["PurchaseOrders"] },
            { href: "/finance/maintenance-requests", label: "Maintenance Requests", icon: Wrench, requiredModules: ["Assets"], allowedRoles: ["Finance"] },
        ],
    },
    {
        label: "Maintenance",
        items: [
            { href: "/maintenance/dashboard", label: "Maintenance Dashboard", icon: Wrench, requiredModules: ["Maintenance"] },
            { href: "/maintenance/schedules", label: "Schedules", icon: CalendarClock, requiredModules: ["Maintenance"] },
            { href: "/maintenance/asset-condition", label: "Asset Condition", icon: HeartPulse, requiredModules: ["Maintenance"] },
        ],
    },
];

const SUPERADMIN_NAV: PermNavSection[] = [
    {
        label: "Platform",
        items: [
            { href: "/superadmin/dashboard", label: "Dashboard", icon: LayoutDashboard },
            { href: "/superadmin/tenant-oversight", label: "Tenant Oversight", icon: Building2 },
            { href: "/superadmin/audit-center", label: "Audit Center", icon: ShieldCheck },
            { href: "/superadmin/risk-monitor", label: "Risk Monitor", icon: AlertTriangle },
            { href: "/superadmin/platform-metrics", label: "Platform Metrics", icon: BarChart3 },
        ],
    },
    {
        label: "Governance",
        items: [
            { href: "/superadmin/role-templates", label: "Role Templates", icon: KeyRound },
            { href: "/superadmin/emergency-controls", label: "Emergency Controls", icon: ShieldAlert },
        ],
    },
];

export type CanViewFn = (moduleName: string) => boolean;

export function getPermittedNavSections(
    canView: CanViewFn,
    isSuperAdmin: boolean,
    userRole?: UserRole | null
): PermNavSection[] {
    if (isSuperAdmin) return SUPERADMIN_NAV;

    return TENANT_NAV
        .map(section => ({
            ...section,
            items: section.items.filter(item => {
                if (item.requiredModules && item.requiredModules.length > 0) {
                    if (!item.requiredModules.some(mod => canView(mod))) return false;
                }
                if (item.allowedRoles && item.allowedRoles.length > 0) {
                    if (!userRole || !item.allowedRoles.includes(userRole)) return false;
                }
                return true;
            }),
        }))
        .filter(section => section.items.length > 0);
}
