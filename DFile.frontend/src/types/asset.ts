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
}

export type UserRole = 'Admin' | 'Maintenance' | 'Procurement' | 'Finance' | 'Super Admin';

export type AssetType = string;

export interface Category {
    id: string;
    name: string;
    description: string;
    type: AssetType;
    items: number;
    status: "Active" | "Archived";
}

export interface Room {
    id: string;
    unitId: string;
    categoryId: string;
    floor: string;
    maxOccupancy: number;
    status: "Available" | "Occupied" | "Maintenance";
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
    department: string;
    role: string;
    hireDate: string;
    status: "Active" | "Inactive" | "Archived";
}
