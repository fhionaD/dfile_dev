const ROUTE_MODULE_MAP: Record<string, string[]> = {
    "/tenant/dashboard": [],
    "/tenant/billing": [],
    "/tenant/organization": ["Departments", "Employees"],
    "/tenant/inventory": ["Assets", "AssetCategories"],
    /** Legacy URL: redirects to Registration & Tagging → Asset Categories tab. */
    "/tenant/asset-categories": ["Assets", "AssetCategories"],
    "/tenant/allocation": ["Assets"],
    "/tenant/locations": ["Rooms"],
    "/tenant/procurement": ["PurchaseOrders"],
    "/tenant/tasks": ["Tasks"],
    "/tenant/departments": ["Departments"],
    "/tenant/roles": ["Departments"],
    "/tenant/users": ["Employees"],
    "/finance/dashboard": ["Assets"],
    "/finance/assets": ["Assets"],
    "/finance/depreciation": ["Assets"],
    "/finance/disposals": ["Assets"],
    "/finance/reports": ["Reports"],
    "/finance/procurement-approvals": ["PurchaseOrders"],
    "/finance/maintenance-requests": ["Assets"],
    "/maintenance/dashboard": ["Maintenance"],
    "/maintenance/work-orders": ["Maintenance"],
    "/maintenance/schedules": ["Maintenance"],
    "/maintenance/asset-condition": ["Maintenance"],
};

export function getRequiredModules(pathname: string): string[] {
    const sorted = Object.keys(ROUTE_MODULE_MAP).sort((a, b) => b.length - a.length);
    const match = sorted.find(route => pathname === route || pathname.startsWith(route + "/"));
    return match ? ROUTE_MODULE_MAP[match] : [];
}

export function isRouteAllowed(
    pathname: string,
    canView: (mod: string) => boolean,
    isSuperAdmin: boolean
): boolean {
    if (isSuperAdmin) return true;
    if (pathname.startsWith("/superadmin")) return false;

    const modules = getRequiredModules(pathname);
    if (modules.length === 0) return true;
    return modules.some(mod => canView(mod));
}
