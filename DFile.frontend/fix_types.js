const fs = require('fs');
let d = fs.readFileSync('src/types/asset.ts', 'utf8');

d += 

export interface RolePermissionEntry {
    id: number;
    moduleName: string;
    canView: boolean;
    canCreate: boolean;
    canEdit: boolean;
    canDelete?: boolean;
    canApprove: boolean;
    canArchive: boolean;
}

export interface RoleTemplate {
    id: number;
    name: string;
    description: string;
    isSystem: boolean;
    createdAt: string;
    isArchived: boolean;
    permissions: RolePermissionEntry[];
    tenantCount: number;
}

export interface Department {
    id: string;
    name: string;
    description: string;
    head: string;
    status: "Active" | "Archived";
}

export interface Role {
    id: string;
    designation: string;
    department: string;
    departmentName: string;
    description: string;
    scope: string;
    status: "Active" | "Archived";
    rowVersion?: string;
}

export interface Employee {
    id: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    email: string;
    contactNumber: string;
    department: string;
    role: string;
    hireDate: string;
    status: "Active" | "Inactive" | "Archived";
}

export interface CreateCategoryPayload {
    categoryName: string;
    description: string;
    handlingType: number;
}

export type NotificationType = "Info" | "Warning" | "Success" | "Error";
export interface Notification {
    id: number;
    type: NotificationType;
    title: string;
    message: string;
    isRead: boolean;
    createdAt: string;
    actionUrl?: string;
    module?: string;
}
;

d = d.replace('export interface RoomCategory {', 'export interface RoomCategory {\n    rowVersion?: string;\n    createdByName?: string;\n    updatedByName?: string;');
d = d.replace('export interface Room {', 'export interface Room {\n    rowVersion?: string;\n    subCategoryName?: string;');
d = d.replace('export interface AssetCategory {', 'export interface AssetCategory {\n    assetCount?: number;');

fs.writeFileSync('src/types/asset.ts', d);
