import { UserRole } from "@/types/asset";

/**
 * Returns the home dashboard path for a given role.
 * Used after login and for cross-role redirects.
 */
export function getDashboardPath(role: UserRole): string {
    const map: Record<UserRole, string> = {
        "Super Admin": "/superadmin/dashboard",
        "Admin": "/tenant/dashboard",
        "Finance": "/finance/dashboard",
        "Maintenance": "/maintenance/dashboard",
    };
    return map[role] ?? "/login";
}

/**
 * Returns the expected URL namespace prefix for a given role.
 */
export function getRoleNamespace(role: UserRole): string {
    const map: Record<UserRole, string> = {
        "Super Admin": "/superadmin",
        "Admin": "/tenant",
        "Finance": "/finance",
        "Maintenance": "/maintenance",
    };
    return map[role] ?? "/login";
}
