import {
    LayoutDashboard, Building2, MapPin, Tag, ShoppingCart, Package, ArrowRightLeft,
    PieChart, TrendingDown, Trash2, FileBarChart,
    Wrench, CalendarClock, HeartPulse,
    ShieldCheck, AlertTriangle, BarChart3, KeyRound, ShieldAlert,
} from "lucide-react";

export interface PermNavItem {
    href: string;
    label: string;
    icon: React.ElementType;
    requiredModules?: string[];
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
        ],
    },
    {
        label: "Asset Management",
        items: [
            { href: "/tenant/inventory", label: "Registration & Tagging", icon: Package, requiredModules: ["Assets"] },
            { href: "/tenant/allocation", label: "Allocation", icon: ArrowRightLeft, requiredModules: ["Assets"] },
        ],
    },
    {
        label: "Configuration",
        items: [
            { href: "/tenant/locations", label: "Locations", icon: MapPin, requiredModules: ["Rooms"] },
            { href: "/tenant/asset-categories", label: "Asset Categories", icon: Tag, requiredModules: ["AssetCategories"] },
        ],
    },
    {
        label: "Procurement",
        items: [
            { href: "/tenant/procurement", label: "Purchase Orders", icon: ShoppingCart, requiredModules: ["PurchaseOrders"] },
        ],
    },
    {
        label: "Finance",
        items: [
            { href: "/finance/dashboard", label: "Finance Dashboard", icon: PieChart, requiredModules: ["Assets"] },
            { href: "/finance/depreciation", label: "Depreciation", icon: TrendingDown, requiredModules: ["Assets"] },
            { href: "/finance/disposals", label: "Disposals", icon: Trash2, requiredModules: ["Assets"] },
            { href: "/finance/reports", label: "Reports", icon: FileBarChart, requiredModules: ["Reports"] },
            { href: "/finance/procurement-approvals", label: "Procurement Approvals", icon: ShoppingCart, requiredModules: ["PurchaseOrders"] },
        ],
    },
    {
        label: "Maintenance",
        items: [
            { href: "/maintenance/dashboard", label: "Maintenance Dashboard", icon: Wrench, requiredModules: ["Maintenance"] },
            { href: "/maintenance/work-orders", label: "Work Orders", icon: CalendarClock, requiredModules: ["Maintenance"] },
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
    isSuperAdmin: boolean
): PermNavSection[] {
    if (isSuperAdmin) return SUPERADMIN_NAV;

    return TENANT_NAV
        .map(section => ({
            ...section,
            items: section.items.filter(item => {
                if (!item.requiredModules || item.requiredModules.length === 0) return true;
                return item.requiredModules.some(mod => canView(mod));
            }),
        }))
        .filter(section => section.items.length > 0);
}
