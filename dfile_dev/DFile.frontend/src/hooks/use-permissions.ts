import { useAuth } from "@/contexts/auth-context";
import { ModulePermission } from "@/types/asset";

export function usePermissions() {
    const { user } = useAuth();

    const isSuperAdmin = user?.role === "Super Admin";
    const permissions: ModulePermission[] = user?.permissions ?? [];

    function getModule(moduleName: string): ModulePermission | undefined {
        return permissions.find(p => p.moduleName === moduleName);
    }

    function canView(moduleName: string): boolean {
        if (isSuperAdmin) return true;
        return getModule(moduleName)?.canView ?? false;
    }

    function canCreate(moduleName: string): boolean {
        if (isSuperAdmin) return true;
        return getModule(moduleName)?.canCreate ?? false;
    }

    function canEdit(moduleName: string): boolean {
        if (isSuperAdmin) return true;
        return getModule(moduleName)?.canEdit ?? false;
    }

    function canApprove(moduleName: string): boolean {
        if (isSuperAdmin) return true;
        return getModule(moduleName)?.canApprove ?? false;
    }

    function canArchive(moduleName: string): boolean {
        if (isSuperAdmin) return true;
        return getModule(moduleName)?.canArchive ?? false;
    }

    function canViewAny(moduleNames: string[]): boolean {
        if (isSuperAdmin) return true;
        return moduleNames.some(m => canView(m));
    }

    return { isSuperAdmin, permissions, canView, canCreate, canEdit, canApprove, canArchive, canViewAny };
}
