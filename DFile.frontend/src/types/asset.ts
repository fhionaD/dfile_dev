export interface Asset {
    id: string;
    tagNumber?: string;
    desc: string;
    categoryId?: string;
    categoryName?: string;
    handlingType?: number;
    status: string;
    room?: string;
    roomId?: string;
    roomCode?: string;
    roomName?: string;
    allocationState?: string;
    lifecycleStatus?: number;
    currentCondition?: number;
    conditionLabel?: string;
    image?: string;
    manufacturer?: string;
    model?: string;
    serialNumber?: string;
    purchaseDate?: string;
    vendor?: string;
    warrantyExpiry?: string;
    nextMaintenance?: string;
    notes?: string;
    documents?: string;
    value: number;
    usefulLifeYears?: number;
    purchasePrice?: number;
    currentBookValue?: number;
    monthlyDepreciation?: number;
    salvagePercentage?: number;
    salvageValue?: number;
    isSalvageOverride?: boolean;
    tenantId?: number;
    permissions?: ModulePermission[];
    archived?: boolean;
    assetStatus?: number;
    assetCode?: string;
    isArchived?: boolean;
    rowVersion?: string;
}

export interface CreateAssetPayload {
    tagNumber: string;
    desc: string;
    categoryId: string;
    status?: string;
    room?: string;
    image?: string;
    manufacturer?: string;
    model?: string;
    serialNumber?: string;
    purchaseDate?: string;
    vendor?: string;
    value?: number;
    usefulLifeYears?: number;
    purchasePrice?: number;
    salvagePercentage?: number;
    isSalvageOverride?: boolean;
    warrantyExpiry?: string;
    notes?: string;
    documents?: string;
}

export interface UpdateAssetPayload extends CreateAssetPayload {
    currentBookValue?: number;
    monthlyDepreciation?: number;
}

export interface UpdateAssetFinancialPayload {
    purchasePrice: number;
    value: number;
    usefulLifeYears: number;
    currentBookValue?: number;
}

export interface User {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    role: UserRole;
    roleLabel: string;
    avatar?: string;
    status: string;
    tenantId?: number;
    permissions?: ModulePermission[];
}

export type UserRole = 'Super Admin' | 'Admin' | 'Finance' | 'Maintenance';

export type AssetType = string;

export interface Category {
    id: string;
    categoryName: string;
    description: string;
    handlingType: number;
    salvagePercentage?: number;
    items: number;
    status: "Active" | "Archived";
    tenantId?: number;
    assetCount?: number;
    updatedAt?: string;
    createdByName?: string;
    updatedByName?: string;
    isArchived?: boolean;
}

export interface CreateCategoryPayload {
    categoryName: string;
    handlingType: number;
    description: string;
    salvagePercentage: number;
}

export interface Room {
    id: string;
    unitId: string;
    name: string;
    categoryId: string;
    categoryName?: string;
    subCategoryId?: string;
    subCategoryName?: string;
    floor: string;
    maxOccupancy: number;
    status: "Available" | "Occupied" | "Maintenance" | "Deactivated";
    archived?: boolean;
    isArchived?: boolean;
}

export interface MaintenanceRecord {
    id: string;
    assetId: string;
    assetName?: string;
    assetCode?: string;
    tagNumber?: string;
    categoryName?: string;
    roomId?: string;
    roomCode?: string;
    roomName?: string;
    description: string;
    status: "Open" | "Inspection" | "Quoted" | "In Progress" | "Completed" | "Scheduled" | "Pending";
    priority: "Low" | "Medium" | "High";
    type: "Preventive" | "Corrective" | "Upgrade" | "Inspection";
    frequency?: "One-time" | "Daily" | "Weekly" | "Monthly" | "Yearly";
    startDate?: string;
    endDate?: string;
    cost?: number;
    attachments?: string;
    diagnosisOutcome?: "Repairable" | "Not Repairable" | null;
    inspectionNotes?: string;
    quotationNotes?: string;
    dateReported: string;
    archived?: boolean;
    isArchived?: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export interface PurchaseOrder {
    id: string;
    assetName: string;
    category: string;
    vendor: string;
    manufacturer: string;
    model: string;
    serialNumber: string;
    purchasePrice: number;
    purchaseDate: string;
    usefulLifeYears: number;
    status: "Pending" | "Approved" | "Delivered" | "Cancelled";
    requestedBy: string;
    createdAt: string;
    assetId?: string;
    archived?: boolean;
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

export interface RoomCategory {
    id: string;
    roomCategoryCode: string;
    name: string;
    description: string;
    isArchived?: boolean;
    archivedAt?: string;
    archivedBy?: string;
    tenantId?: number;
    roomCount: number;
    subCategoryCount: number;
    rowVersion?: string;
    createdAt?: string;
    updatedAt?: string;
    createdByName?: string;
    updatedByName?: string;
}

export interface RoomSubCategory {
    id: string;
    subCategoryCode: string;
    name: string;
    description: string;
    roomCategoryId: string;
    categoryName?: string;
    isArchived?: boolean;
    tenantId?: number;
    rowVersion?: string;
    createdAt?: string;
    updatedAt?: string;
    createdByName?: string;
    updatedByName?: string;
}

export interface Role {
    id: string;
    designation: string;
    department: string;
    scope: string;
    status?: "Active" | "Archived";
}

export interface Department {
    id: string;
    name: string;
    description: string;
    head: string;
    status: "Active" | "Archived";
}

export interface AuditLog {
    id: number;
    action: string;
    entityType: string;
    entityId?: string;
    module?: string;
    description?: string;
    userRole?: string;
    userId?: number;
    userName?: string;
    tenantId?: number;
    oldValues?: string;
    newValues?: string;
    ipAddress?: string;
    createdAt: string;
}

/** Matches GET /api/auditlogs/summary grouped arrays (camelCase JSON). */
export interface AuditSummary {
    totalLogs: number;
    todayLogs: number;
    weekLogs: number;
    byAction: Array<{ action: string | null; count: number }>;
    byEntity: Array<{ entityType: string | null; count: number }>;
}

export interface RolePermissionEntry {
    id: number;
    moduleName: string;
    canView: boolean;
    canCreate: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canApprove: boolean;
    canArchive: boolean;
}

export interface RoleTemplate {
    id: number;
    name: string;
    description?: string;
    isSystem: boolean;
    createdAt: string;
    permissions: RolePermissionEntry[];
    tenantCount: number;
}

export interface PlatformMetrics {
    totalTenants: number;
    activeTenants: number;
    suspendedTenants: number;
    totalUsers: number;
    totalAssets: number;
    totalRooms: number;
    totalMaintenanceRecords: number;
    pendingOrders: number;
    openMaintenanceRecords: number;
}

export interface RiskIndicators {
    expiredWarranties: number;
    overdueMaintenanceCount: number;
    highPriorityPending: number;
    fullyDepreciated: number;
    suspendedTenants: number;
}
export type NotificationType = "Info" | "Warning" | "Success" | "Error"; export interface Notification { id: number; type: NotificationType; message: string; isRead: boolean; createdAt: string; link?: string; module?: string; }
export interface AssetAllocation { id: string; assetId: string; roomId: string; allocatedBy: string; allocatedDate: string; remarks?: string; assetName?: string; roomName?: string; roomCode?: string; }
export interface AllocatedAssetForMaintenance { assetId: string; assetCode?: string; assetName?: string; tagNumber?: string; categoryName?: string; roomId: string; roomCode?: string; roomName?: string; allocatedAt: string; tenantId?: number; }

export interface ModulePermission { moduleId?: string; moduleName: string; accessLevel?: string; canView: boolean; canCreate: boolean; canEdit: boolean; canDelete: boolean; canApprove?: boolean; canArchive?: boolean; canRestore?: boolean; }

export type HandlingType = 'Fixed' | 'Moveable' | 'Consumable';
