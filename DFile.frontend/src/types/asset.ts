export interface Asset {
    id: string;
    desc: string;
    cat: string;
    status: string;
    room: string;
    image?: string;
    manufacturer?: string;
    model?: string;
    serialNumber?: string;
    purchaseDate?: string;
    vendor?: string;
    warrantyExpiry?: string;
    nextMaintenance?: string;
    notes?: string;
    docs?: string[];
    value: number;
    usefulLifeYears?: number;
    purchasePrice?: number;
    currentBookValue?: number;
    monthlyDepreciation?: number;
}


export interface User {
    name: string;
    role: UserRole;
    roleLabel: string;
    avatar?: string;
    tenantId?: number;
    mustChangePassword?: boolean;
}

export type UserRole = 'Admin' | 'Tenant Admin' | 'Maintenance' | 'Procurement' | 'Finance' | 'Super Admin' | 'Employee';

export interface TenantSubscription {
    id: number;
    name: string;
    subscriptionPlan: number; // 0=Starter, 1=Basic, 2=Pro
    maxRooms: number;
    maxPersonnel: number;
    assetTracking: boolean;
    depreciation: boolean;
    maintenanceModule: boolean;
    reportsLevel: string; // "Standard" | "Able"
    status: string;
}

export type HandlingType = "Consumable" | "Moveable" | "Fixed";

export interface Category {
    id: string;
    name: string;
    description: string;
    handlingType: HandlingType;
    items: number;
    status: "Active" | "Archived";
    isArchived: boolean;
    createdAt?: string;
    createdBy?: string;
    updatedAt?: string;
    updatedBy?: string;
    archivedAt?: string;
    archivedBy?: string;
}

export interface Room {
    id: string;
    unitId: string; // The Room Number/ID (e.g. 101)
    name: string;   // The Room Name (e.g. Master Bedroom)
    categoryId: string;
    categoryName?: string; // Optional for display
    subCategoryName?: string; // Optional for display
    floor: string;
    maxOccupancy: number;
    status: "Available" | "Occupied" | "Maintenance" | "Deactivated";
    archived?: boolean;
}

export interface MaintenanceRecord {
    id: string;
    assetId: string;
    description: string;
    status: "Pending" | "In Progress" | "Completed" | "Scheduled";
    priority: "Low" | "Medium" | "High";
    type: "Preventive" | "Corrective" | "Upgrade" | "Inspection";
    frequency?: "One-time" | "Daily" | "Weekly" | "Monthly" | "Yearly";
    startDate?: string;
    endDate?: string;
    cost?: number;
    attachments?: string[];
    dateReported: string;
    archived?: boolean;
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
    assetId?: string; // linked asset ID once delivered
    archived?: boolean;
}

export interface Employee {
    id: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    email: string;
    contactNumber: string;
    role: string;
    hireDate: string;
    status: "Active" | "Inactive" | "Archived";
    password?: string; // Used during registration
}

export interface RoomCategory {
    id: string;
    name: string; // The Main Category (e.g. Deluxe)
    subCategory: string; // The Sub Category (e.g. Double Bed)
    description: string;
    baseRate: number;
    maxOccupancy: number; // Keep existing but maybe optional? User didn't say to remove but focused on inputting cat/subcat.
    status: "Active" | "Archived";
    archived?: boolean; // For archive logic
}

export interface Role {
    id: string;
    designation: string;
    scope: string;
    // Optional fields for backward compatibility or future use
    title?: string;
    description?: string;
    permissions?: string[];
    users?: number;
    status?: "Active" | "Archived";
}




