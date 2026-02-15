"use client";

import React, { createContext, useContext, useState } from "react";
import { Asset, Category, Room, MaintenanceRecord, PurchaseOrder, Employee, AssetType, UserRole } from "@/types/asset";
import { toast } from "sonner";

// Initial Data Imports (Moved from AppShell)
const initialAssets: Asset[] = [
    { id: "AST-001", desc: "Samsung 55\" Smart TV", cat: "Electronics", status: "In Use", room: "R-101", value: 1200, manufacturer: "Samsung", model: "QN55Q60A", serialNumber: "SAM-TV-55-001", purchaseDate: "2023-01-15" },
    { id: "AST-002", desc: "Office Desk (Standing)", cat: "Furniture", status: "Available", room: "—", value: 850 },
    { id: "AST-003", desc: "HVAC Unit Central", cat: "Maintenance", status: "Maintenance", room: "R-205", value: 3400 },
    { id: "AST-004", desc: "Leather Sofa Set", cat: "Furniture", status: "In Use", room: "R-102", value: 2100 },
    { id: "AST-005", desc: "Security Camera Kit", cat: "Electronics", status: "Disposed", room: "—", value: 600 },
    { id: "AST-006", desc: "MacBook Pro M3", cat: "Electronics", status: "In Use", room: "R-103", value: 2400 },
    { id: "AST-007", desc: "Ergonomic Chair", cat: "Furniture", status: "Available", room: "—", value: 550 },
    { id: "AST-008", desc: "Projector 4K", cat: "Electronics", status: "In Use", room: "Conf-A", value: 1800 },
    { id: "AST-009", desc: "Drill Set", cat: "Maintenance", status: "Available", room: "—", value: 300 },
    { id: "AST-010", desc: "Conference Table", cat: "Furniture", status: "In Use", room: "Conf-A", value: 3200 },
    { id: "AST-011", desc: "Water Cooler", cat: "Furniture", status: "Maintenance", room: "Hall-B", value: 400 },
    { id: "AST-012", desc: "Server Rack", cat: "Electronics", status: "In Use", room: "Server-1", value: 5000 },
];

interface DataContextType {
    assets: Asset[];
    employees: Employee[];
    maintenanceRecords: MaintenanceRecord[];
    purchaseOrders: PurchaseOrder[];
    rooms: Room[];
    assetCategories: Category[];
    roomCategories: any[]; // define proper type if available
    departments: { id: string; name: string }[];
    roles: { id: string; designation: string; department: string; scope: string }[];

    // Asset Actions
    addAsset: (asset: Asset) => void;
    allocateAsset: (assetId: string, roomId: string) => void;
    archiveAsset: (id: string) => void;

    // Maintenance Actions
    addMaintenanceRecord: (record: MaintenanceRecord) => void;
    updateMaintenanceRecord: (record: MaintenanceRecord) => void;
    archiveMaintenanceRecord: (id: string) => void;
    updateMaintenanceStatus: (id: string, status: MaintenanceRecord['status']) => void;

    // Order/Procurement Actions
    createOrder: (order: PurchaseOrder, asset: Asset) => void;
    archiveOrder: (id: string) => void;

    // Employee Actions
    addEmployee: (employee: Employee) => void;
    archiveEmployee: (id: string) => void;

    // Room Actions
    addRoom: (room: Room) => void;
    updateRoom: (room: Room) => void;
    archiveRoom: (id: string) => void;

    // Category Actions
    addAssetCategory: (cat: any) => void;
    updateAssetCategory: (id: string, data: Partial<Category>) => void;
    archiveAssetCategory: (id: string) => void;

    addRoomCategory: (cat: any) => void;
    updateRoomCategory: (id: string, data: any) => void;
    archiveRoomCategory: (id: string) => void;

    // Role Actions
    addRole: (role: any) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
    // Assets
    const [assets, setAssets] = useState<Asset[]>(initialAssets);

    // Maintenance
    const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([
        { id: "mr_1", assetId: "AST-003", description: "Filter replacement required", status: "Pending", priority: "Medium", type: "Preventive", frequency: "Monthly", dateReported: "2024-03-10" },
        { id: "mr_2", assetId: "AST-011", description: "Leaking tap", status: "In Progress", priority: "High", type: "Corrective", dateReported: "2024-03-12" },
    ]);

    // Employees
    const [employees, setEmployees] = useState<Employee[]>([
        { id: "EMP-001", firstName: "Alex", lastName: "Thompson", email: "alex.t@company.com", contactNumber: "091234567890", department: "Administration", role: "Property Admin", hireDate: "2023-06-15", status: "Active" },
        { id: "EMP-002", firstName: "Maria", middleName: "Santos", lastName: "Cruz", email: "maria.c@company.com", contactNumber: "091987654321", department: "Maintenance", role: "Maintenance Lead", hireDate: "2023-09-01", status: "Active" },
    ]);

    // Procurement
    const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([
        { id: "PO-001", assetName: "Samsung 55\" Smart TV", category: "Electronics", vendor: "TechSupply Co.", manufacturer: "Samsung", model: "QN90C", serialNumber: "SN-TV55001", purchasePrice: 1200, purchaseDate: "2024-01-15", usefulLifeYears: 5, status: "Delivered", requestedBy: "Alex Thompson", createdAt: "2024-01-10", assetId: "AST-001" },
        { id: "PO-002", assetName: "Conference Table", category: "Furniture", vendor: "OfficePlus", manufacturer: "Steelcase", model: "CT-2400", serialNumber: "SN-TBL002", purchasePrice: 3200, purchaseDate: "2024-02-01", usefulLifeYears: 10, status: "Delivered", requestedBy: "Alex Thompson", createdAt: "2024-01-25", assetId: "AST-010" },
        { id: "PO-003", assetName: "Industrial Drill", category: "Maintenance", vendor: "ToolMaster", manufacturer: "DeWalt", model: "DW-500", serialNumber: "SN-DRL003", purchasePrice: 300, purchaseDate: "2024-03-01", usefulLifeYears: 3, status: "Approved", requestedBy: "Alex Thompson", createdAt: "2024-02-28" },
    ]);

    // Categories
    const [assetCategories, setAssetCategories] = useState<Category[]>([
        { id: "ac_1", name: "Electronics", description: "TVs, Smart Home", type: "Moveable", items: 12, status: "Active" },
        { id: "ac_2", name: "Furniture", description: "Sofas, Tables, Chairs", type: "Fixed", items: 45, status: "Active" },
        { id: "ac_3", name: "Maintenance", description: "Tools, Paint", type: "Soft", items: 8, status: "Active" },
    ]);

    // Rooms
    const [rooms, setRooms] = useState<Room[]>([
        { id: "rm_1", unitId: "R-101", categoryId: "rc_1", floor: "1st Floor", maxOccupancy: 2, status: "Occupied", archived: false },
        { id: "rm_2", unitId: "R-102", categoryId: "rc_1", floor: "1st Floor", maxOccupancy: 2, status: "Available", archived: false },
    ]);

    // Room Categories
    const [roomCategories, setRoomCategories] = useState<{ id: string; name: string; description: string; baseRate: number; maxOccupancy?: number; status: "Active" | "Archived" }[]>([
        { id: "rc_1", name: "Studio Suite", description: "Compact unit", baseRate: 800, status: "Active" },
    ]);

    // Roles & Departments
    const [departments, setDepartments] = useState([
        { id: "dept_1", name: "Property Operations" },
        { id: "dept_2", name: "Maintenance & Facilities" },
    ]);

    const [roles, setRoles] = useState([
        { id: "role_1", designation: "Senior Property Manager", department: "Property Operations", scope: "Full system oversight" },
    ]);

    // --- Action Implementations ---

    const addAsset = (asset: Asset) => {
        // Auto-calculate depreciation logic from AppShell
        const purchasePrice = asset.purchasePrice ?? asset.value ?? 0;
        const usefulLifeYears = asset.usefulLifeYears ?? 0;
        let enrichedAsset = { ...asset, purchasePrice };

        if (usefulLifeYears > 0 && purchasePrice > 0) {
            const monthlyDepreciation = purchasePrice / (usefulLifeYears * 12);
            let ageMonths = 0;
            if (asset.purchaseDate) {
                const pd = new Date(asset.purchaseDate);
                const now = new Date();
                ageMonths = Math.max(0, (now.getFullYear() - pd.getFullYear()) * 12 + (now.getMonth() - pd.getMonth()));
            }
            const totalDep = Math.min(monthlyDepreciation * ageMonths, purchasePrice);
            enrichedAsset = {
                ...enrichedAsset,
                monthlyDepreciation,
                currentBookValue: Math.max(purchasePrice - totalDep, 0),
            };
        } else {
            enrichedAsset = { ...enrichedAsset, currentBookValue: purchasePrice };
        }

        setAssets(prev => [enrichedAsset, ...prev]);
        toast.success("Asset registered successfully");
    };

    const allocateAsset = (assetId: string, roomId: string) => {
        setAssets(prev => prev.map(a => {
            if (a.id === assetId) return { ...a, status: "In Use", room: roomId };
            return a;
        }));
        toast.success("Asset allocated successfully");
    };

    const archiveAsset = (id: string) => {
        let isArchiving = false;
        setAssets((prev) => prev.map((a) => {
            if (a.id === id) {
                isArchiving = a.status !== "Archived";
                return { ...a, status: a.status === "Archived" ? "Available" : "Archived" };
            }
            return a;
        }));
        toast.success(isArchiving ? "Asset moved to archives" : "Asset restored to inventory");
    };

    // Maintenance
    const addMaintenanceRecord = (record: MaintenanceRecord) => {
        setMaintenanceRecords(prev => [record, ...prev]);
        setAssets(prev => prev.map(a => a.id === record.assetId ? { ...a, status: "Maintenance" } : a));
        toast.success("Maintenance request created");
    };

    const updateMaintenanceRecord = (updatedRecord: MaintenanceRecord) => {
        setMaintenanceRecords(prev => prev.map(r => r.id === updatedRecord.id ? updatedRecord : r));
        toast.success("Maintenance record updated");
    };

    const archiveMaintenanceRecord = (id: string) => {
        setMaintenanceRecords(prev => prev.map(r => r.id === id ? { ...r, archived: !r.archived } : r));
        toast.success("Maintenance record archived");
    };

    const updateMaintenanceStatus = (id: string, status: MaintenanceRecord['status']) => {
        setMaintenanceRecords(records => records.map(r => r.id === id ? { ...r, status } : r));
    };

    // Procurement
    const createOrder = (order: PurchaseOrder, asset: Asset) => {
        setPurchaseOrders(prev => [order, ...prev]);
        addAsset(asset); // Re-use addAsset for the asset creation part
    };

    const archiveOrder = (id: string) => {
        setPurchaseOrders((prev) => prev.map((o) => o.id === id ? { ...o, archived: !o.archived } : o));
    };

    // Employees
    const addEmployee = (employee: Employee) => {
        let exists = false;
        setEmployees(prev => {
            exists = prev.some(e => e.id === employee.id);
            if (exists) {
                return prev.map(e => e.id === employee.id ? employee : e);
            }
            return [employee, ...prev];
        });
        toast.success(exists ? "Employee updated" : "Employee added");
    };

    const archiveEmployee = (id: string) => {
        setEmployees((prev) => prev.map((e) => e.id === id ? { ...e, status: e.status === "Archived" ? "Active" : "Archived" } : e));
    };

    // Rooms
    const addRoom = (room: Room) => {
        setRooms(prev => [room, ...prev]);
        toast.success("Room created");
    };

    const updateRoom = (room: Room) => {
        setRooms(prev => prev.map(r => r.id === room.id ? room : r));
        toast.success("Room updated");
    };

    const archiveRoom = (id: string) => {
        setRooms(prev => prev.map(r => r.id === id ? { ...r, archived: !r.archived } : r));
        const room = rooms.find(r => r.id === id);
        toast(room?.archived ? "Room unit restored" : "Room unit archived");
    };

    // Categories
    const addAssetCategory = (newCat: any) => setAssetCategories(prev => [...prev, { ...newCat, items: 0, status: "Active" }]);
    const updateAssetCategory = (id: string, data: Partial<Category>) => setAssetCategories(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
    const archiveAssetCategory = (id: string) => setAssetCategories(prev => prev.map(c => c.id === id ? { ...c, status: c.status === "Archived" ? "Active" : "Archived" } : c));

    const addRoomCategory = (data: any) => setRoomCategories(prev => [...prev, { ...data, id: `rc_${Date.now()}`, status: "Active" }]);
    const updateRoomCategory = (id: string, data: any) => setRoomCategories(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
    const archiveRoomCategory = (id: string) => setRoomCategories(prev => prev.map(c => c.id === id ? { ...c, status: c.status === "Archived" ? "Active" : "Archived" } : c));

    // Roles
    const addRole = (newRole: any) => {
        setRoles((prev) => [{ ...newRole, id: String(newRole.id) }, ...prev]);
        setDepartments((prev) => {
            const exists = prev.some(d => d.name.toLowerCase() === newRole.department.toLowerCase());
            if (!exists) return [...prev, { id: `dept_${Date.now()}`, name: newRole.department }];
            return prev;
        });
        toast.success("Role created");
    };

    return (
        <DataContext.Provider value={{
            assets, employees, maintenanceRecords, purchaseOrders, rooms, assetCategories, roomCategories, departments, roles,
            addAsset, allocateAsset, archiveAsset,
            addMaintenanceRecord, updateMaintenanceRecord, archiveMaintenanceRecord, updateMaintenanceStatus,
            createOrder, archiveOrder,
            addEmployee, archiveEmployee,
            addRoom, updateRoom, archiveRoom,
            addAssetCategory, updateAssetCategory, archiveAssetCategory,
            addRoomCategory, updateRoomCategory, archiveRoomCategory,
            addRole
        }}>
            {children}
        </DataContext.Provider>
    );
}

export function useData() {
    const context = useContext(DataContext);
    if (context === undefined) {
        throw new Error("useData must be used within a DataProvider");
    }
    return context;
}
