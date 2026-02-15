"use client";

import { useState } from "react";
import Image from "next/image";
import {
    LayoutDashboard, ShoppingCart, QrCode, UserCheck, Wrench,
    TrendingDown, UserPlus, Award, UserCog, LogOut, LayoutGrid,
    DoorOpen, Layers, ChevronDown, Search, Bell, User,
    Plus, Building2, Menu, ArrowLeft
} from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/theme-toggle";

import { AssetStats } from "@/components/asset-stats";
import { AssetTable } from "@/components/asset-table";
import { RolesDashboard } from "@/components/roles-dashboard";
import { AddAssetModal } from "@/components/modals/add-asset-modal";
import { AcquisitionModal } from "@/components/modals/acquisition-modal";
import { AddEmployeeModal } from "@/components/modals/add-employee-modal";
import { CreateRoleModal } from "@/components/modals/create-role-modal";
import { CreateTenantAdminModal } from "@/components/modals/create-tenant-admin-modal";
import { ManageCategoriesModal } from "@/components/modals/manage-categories-modal";
import { ManageRoomCategoriesModal } from "@/components/modals/manage-room-categories-modal";
import { RoomModal } from "@/components/modals/create-room-modal";
import { CreateMaintenanceModal } from "@/components/modals/create-maintenance-modal";
import { RoomListView } from "@/components/room-list-view";
import { MaintenanceView } from "@/components/maintenance-view";
import { MaintenancePage } from "@/components/maintenance-page";
import { RegistrationView } from "@/components/registration-view";
import { AssetAllocationView } from "@/components/asset-allocation-view";
import { AssetDetailsModal } from "@/components/modals/asset-details-modal";
import { EmployeeDetailsModal } from "@/components/modals/employee-details-modal";
import { OrderDetailsModal } from "@/components/modals/order-details-modal";
import { MaintenanceDetailsModal } from "@/components/modals/maintenance-details-modal";
import { DepreciationView } from "@/components/depreciation-view";
import { ProcurementView } from "@/components/procurement-view";
import { Asset, Category, AssetType, Room, MaintenanceRecord, PurchaseOrder, Employee, UserRole, User as UserType } from "@/types/asset";

// ... (existing imports)

const initialAssets: Asset[] = [
    {
        id: "AST-001",
        desc: "Samsung 55\" Smart TV",
        cat: "Electronics",
        status: "In Use",
        room: "R-101",
        value: 1200,
        manufacturer: "Samsung",
        model: "QN55Q60A",
        serialNumber: "SAM-TV-55-001",
        purchaseDate: "2023-01-15",
        // image: "..." // Placeholder or real URL if available
    },
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

interface AppShellProps {
    currentUser: UserType;
    onLogout: () => void;
}

interface NavItem {
    id: string;
    label: string;
    icon: React.ElementType;
    action?: () => void;
    allowedRoles?: UserRole[];
}

const defaultUser: UserType = {
    name: "Guest User",
    role: "Admin",
    roleLabel: "Guest"
};

export function AppShell({ currentUser = defaultUser, onLogout }: AppShellProps) {
    // If currentUser is somehow null (e.g. from parent), fallback to defaultUser
    const safeUser = currentUser || defaultUser;

    const userRole = safeUser.role;
    const [activeView, setActiveView] = useState(userRole === 'Maintenance' ? 'Maintenance' : "Control Center");
    const [isAcquisitionExpanded, setIsAcquisitionExpanded] = useState(true);

    // Modal states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isTenantModalOpen, setIsTenantModalOpen] = useState(false);
    const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
    const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [isAcquisitionModalOpen, setIsAcquisitionModalOpen] = useState(false);
    const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
    const [isRoomCategoryModalOpen, setIsRoomCategoryModalOpen] = useState(false);
    const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [isEmployeeDetailsOpen, setIsEmployeeDetailsOpen] = useState(false);
    const [isOrderDetailsOpen, setIsOrderDetailsOpen] = useState(false);
    const [isMaintenanceDetailsOpen, setIsMaintenanceDetailsOpen] = useState(false);
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
    const [selectedMaintenanceRecord, setSelectedMaintenanceRecord] = useState<MaintenanceRecord | null>(null);
    const [selectedAssetIdForMaintenance, setSelectedAssetIdForMaintenance] = useState<string | null>(null);
    const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

    const [selectedAssetForReplacement, setSelectedAssetForReplacement] = useState<Asset | null>(null);

    const handleScheduleMaintenance = (assetId: string) => {
        setSelectedMaintenanceRecord(null);
        setSelectedAssetIdForMaintenance(assetId);
        setIsMaintenanceModalOpen(true);
    };

    const handleRequestReplacement = (assetId: string) => {
        const asset = assets.find(a => a.id === assetId);
        if (asset) {
            setSelectedAssetForReplacement(asset);
            setIsAcquisitionModalOpen(true);
        }
    };

    // ... existing handlers ...


    const handleAssetClick = (asset: Asset) => {
        setSelectedAsset(asset);
        setIsDetailsModalOpen(true);
    };

    const handleEmployeeClick = (employee: Employee) => {
        setSelectedEmployee(employee);
        setIsEmployeeDetailsOpen(true);
    };

    const handleOrderClick = (order: PurchaseOrder) => {
        setSelectedOrder(order);
        setIsOrderDetailsOpen(true);
    };

    const handleMaintenanceRecordClick = (record: MaintenanceRecord) => {
        setSelectedMaintenanceRecord(record);
        setIsMaintenanceDetailsOpen(true);
    };

    // ...

    // Data states
    const [assets, setAssets] = useState<Asset[]>(initialAssets);
    const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([
        { id: "mr_1", assetId: "AST-003", description: "Filter replacement required", status: "Pending", priority: "Medium", type: "Preventive", frequency: "Monthly", dateReported: "2024-03-10" },
        { id: "mr_2", assetId: "AST-011", description: "Leaking tap", status: "In Progress", priority: "High", type: "Corrective", dateReported: "2024-03-12" },
    ]);

    const handleAddMaintenanceRecord = (record: MaintenanceRecord) => {
        setMaintenanceRecords(prev => [record, ...prev]);
        setAssets(prev => prev.map(a => a.id === record.assetId ? { ...a, status: "Maintenance" } : a));
    };

    const [employees, setEmployees] = useState<Employee[]>([
        { id: "EMP-001", firstName: "Alex", lastName: "Thompson", email: "alex.t@company.com", contactNumber: "091234567890", department: "Administration", role: "Property Admin", hireDate: "2023-06-15", status: "Active" },
        { id: "EMP-002", firstName: "Maria", middleName: "Santos", lastName: "Cruz", email: "maria.c@company.com", contactNumber: "091987654321", department: "Maintenance", role: "Maintenance Lead", hireDate: "2023-09-01", status: "Active" },
    ]);

    const handleAddEmployee = (employee: Employee) => {
        // Check if employee already exists (update mode)
        let exists = false;
        setEmployees(prev => {
            exists = prev.some(e => e.id === employee.id);
            if (exists) {
                return prev.map(e => e.id === employee.id ? employee : e);
            }
            return [employee, ...prev];
        });

        // Update selected employee if it's currently selected
        if (selectedEmployee && selectedEmployee.id === employee.id) {
            setSelectedEmployee(employee);
        }

        setIsEmployeeModalOpen(false);
    };

    const handleEditEmployee = (employee: Employee) => {
        setSelectedEmployee(employee);
        setIsEmployeeDetailsOpen(false);
        setIsEmployeeModalOpen(true);
    };

    const [assetCategories, setAssetCategories] = useState<Category[]>([
        { id: "ac_1", name: "Electronics", description: "TVs, Smart Home", type: "Moveable", items: 12, status: "Active" },
        { id: "ac_2", name: "Furniture", description: "Sofas, Tables, Chairs", type: "Fixed", items: 45, status: "Active" },
        { id: "ac_3", name: "Maintenance", description: "Tools, Paint", type: "Soft", items: 8, status: "Active" },
    ]);

    // Purchase Orders state
    const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([
        { id: "PO-001", assetName: "Samsung 55\" Smart TV", category: "Electronics", vendor: "TechSupply Co.", manufacturer: "Samsung", model: "QN90C", serialNumber: "SN-TV55001", purchasePrice: 1200, purchaseDate: "2024-01-15", usefulLifeYears: 5, status: "Delivered", requestedBy: "Alex Thompson", createdAt: "2024-01-10", assetId: "AST-001" },
        { id: "PO-002", assetName: "Conference Table", category: "Furniture", vendor: "OfficePlus", manufacturer: "Steelcase", model: "CT-2400", serialNumber: "SN-TBL002", purchasePrice: 3200, purchaseDate: "2024-02-01", usefulLifeYears: 10, status: "Delivered", requestedBy: "Alex Thompson", createdAt: "2024-01-25", assetId: "AST-010" },
        { id: "PO-003", assetName: "Industrial Drill", category: "Maintenance", vendor: "ToolMaster", manufacturer: "DeWalt", model: "DW-500", serialNumber: "SN-DRL003", purchasePrice: 300, purchaseDate: "2024-03-01", usefulLifeYears: 3, status: "Approved", requestedBy: "Alex Thompson", createdAt: "2024-02-28" },
    ]);

    const handleCreateOrder = (order: PurchaseOrder, asset: Asset) => {
        setPurchaseOrders(prev => [order, ...prev]);
        // Also add the asset with depreciation fields
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
            enrichedAsset = { ...enrichedAsset, monthlyDepreciation, currentBookValue: Math.max(purchasePrice - totalDep, 0) };
        } else {
            enrichedAsset = { ...enrichedAsset, currentBookValue: purchasePrice };
        }
        setAssets(prev => [enrichedAsset, ...prev]);
    };

    const handleAddAsset = (asset: Asset) => {
        // Auto-calculate depreciation fields
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
        // Stay on Registration view — RegistrationView auto-switches to Tagging tab
    };

    const handleAllocateAsset = (assetId: string, roomId: string) => {
        setAssets(prev => prev.map(a => {
            if (a.id === assetId) {
                return { ...a, status: "In Use", room: roomId };
            }
            return a;
        }));
        // Optional: Update room status if needed, or just asset location
        // Ensure we route back or show success feedback if needed, but for now stay on view
        toast.success("Asset allocated successfully");
    };


    const [rooms, setRooms] = useState<Room[]>([
        { id: "rm_1", unitId: "R-101", categoryId: "rc_1", floor: "1st Floor", maxOccupancy: 2, status: "Occupied", archived: false },
        { id: "rm_2", unitId: "R-102", categoryId: "rc_1", floor: "1st Floor", maxOccupancy: 2, status: "Available", archived: false },
    ]);

    const handleAddRoom = (newRoom: Room) => {
        setRooms(prev => [newRoom, ...prev]);
        setActiveView("Room Units"); // Navigate to list
    };

    const handleSaveRoom = (room: Room) => {
        if (selectedRoom) {
            // Update existing
            setRooms(prev => prev.map(r => r.id === room.id ? room : r));
        } else {
            // Create new
            setRooms(prev => [room, ...prev]);
        }

        setIsRoomModalOpen(false);
        setSelectedRoom(null);
        toast.success(selectedRoom ? "Room details updated" : "New room unit created");
    };

    const handleArchiveRoom = (roomId: string) => {
        setRooms(prev => prev.map(r => r.id === roomId ? { ...r, archived: !r.archived } : r));
        const room = rooms.find(r => r.id === roomId);
        const isArchiving = !room?.archived;
        toast(isArchiving ? "Room unit archived" : "Room unit restored", {
            description: isArchiving ? "The unit is now hidden from active lists." : "The unit is now active again.",
        });
    };

    const handleRoomClick = (room: Room) => {
        setSelectedRoom(room);
        setIsRoomModalOpen(true);
    };

    const [roomCategories, setRoomCategories] = useState<{ id: string; name: string; description: string; baseRate: number; maxOccupancy?: number; status: "Active" | "Archived" }[]>([
        { id: "rc_1", name: "Studio Suite", description: "Compact unit", baseRate: 800, status: "Active" },
    ]);

    const [departments, setDepartments] = useState([
        { id: "dept_1", name: "Property Operations" },
        { id: "dept_2", name: "Maintenance & Facilities" },
    ]);

    const [roles, setRoles] = useState([
        { id: "role_1", designation: "Senior Property Manager", department: "Property Operations", scope: "Full system oversight" },
    ]);

    // Handlers
    const handleAddRole = (newRole: { id: number; designation: string; department: string; scope: string }) => {
        setRoles((prev) => [{ ...newRole, id: String(newRole.id) }, ...prev]);

        // Add department if it doesn't exist
        setDepartments((prev) => {
            const exists = prev.some(d => d.name.toLowerCase() === newRole.department.toLowerCase());
            if (!exists) {
                return [...prev, { id: `dept_${Date.now()}`, name: newRole.department }];
            }
            return prev;
        });

        toast.success("New role definition created");
    };

    const handleAddAssetCategory = (newCat: { id: string; name: string; description: string; type: AssetType }) =>
        setAssetCategories((prev) => [...prev, { ...newCat, items: 0, status: "Active" }]);
    const handleUpdateAssetCategory = (id: string, data: Partial<Category>) =>
        setAssetCategories((prev) => prev.map((c) => (c.id === id ? { ...c, ...data } : c)));
    const handleArchiveAssetCategory = (id: string) =>
        setAssetCategories((prev) => prev.map((c) => c.id === id ? { ...c, status: c.status === "Archived" ? "Active" : "Archived" } : c));

    const handleAddRoomCategory = (data: { name: string; description: string; baseRate: number; maxOccupancy?: number }) =>
        setRoomCategories((prev) => [...prev, { ...data, id: `rc_${Date.now()}`, status: "Active" as const }]);
    const handleUpdateRoomCategory = (id: string, data: Partial<typeof roomCategories[0]>) =>
        setRoomCategories((prev) => prev.map((c) => (c.id === id ? { ...c, ...data } : c)));
    const handleArchiveRoomCategory = (id: string) =>
        setRoomCategories((prev) => prev.map((c) => c.id === id ? { ...c, status: (c.status === "Archived" ? "Active" : "Archived") as "Active" | "Archived" } : c));

    // Archive handlers for all entity types
    const handleArchiveAsset = (id: string) => {
        setAssets((prev) => prev.map((a) => a.id === id ? { ...a, status: a.status === "Archived" ? "Available" : "Archived" } : a));
        const asset = assets.find(a => a.id === id);
        toast.success(asset?.status === "Archived" ? "Asset restored to inventory" : "Asset moved to archives");
    };
    const handleArchiveEmployee = (id: string) =>
        setEmployees((prev) => prev.map((e) => e.id === id ? { ...e, status: e.status === "Archived" ? "Active" : "Archived" } : e));
    const handleArchiveOrder = (id: string) =>
        setPurchaseOrders((prev) => prev.map((o) => o.id === id ? { ...o, archived: !o.archived } : o));
    const handleArchiveMaintenanceRecord = (id: string) =>
        setMaintenanceRecords((prev) => prev.map((r) => r.id === id ? { ...r, archived: !r.archived } : r));

    const handleUpdateMaintenanceRecord = (updatedRecord: MaintenanceRecord) => {
        setMaintenanceRecords(prev => prev.map(r => r.id === updatedRecord.id ? updatedRecord : r));
    };

    // Nav items
    // Reorganized per user request:
    // 0. Dashboard (Control Center)
    // 1. Asset acquisition / purchase (Procurement)
    // 2. Asset registration and tagging (Registration)
    // 3. Asset allocation / assignment (Allocation)
    // 4. Asset deprecation (Depreciation)
    const dashboardNavItem: NavItem = { id: "Control Center", label: "Dashboard", icon: LayoutDashboard, allowedRoles: ['Admin', 'Finance'] };

    const mainNavItems: NavItem[] = [
        { id: "Procurement", label: "Asset Acquisition / Purchase", icon: ShoppingCart, allowedRoles: ['Admin', 'Procurement'] },
        { id: "Registration", label: "Asset Registration & Tagging", icon: QrCode, allowedRoles: ['Admin', 'Procurement'] },
        { id: "Allocation", label: "Asset Allocation / Assignment", icon: UserCheck, allowedRoles: ['Admin'] },
        { id: "Depreciation", label: "Asset Deprecation", icon: TrendingDown, allowedRoles: ['Admin', 'Finance'] },
        { id: "Maintenance", label: "Asset Maintenance & Repair", icon: Wrench, allowedRoles: ['Admin', 'Maintenance'] },
    ];

    const adminNavItems: NavItem[] = [
        { id: "Room Units", label: "Room Units", icon: DoorOpen, allowedRoles: ['Admin'] },
        { id: "Organization", label: "Organization", icon: Building2, allowedRoles: ['Admin'] },
    ];

    const NavButton = ({ item, isActive, onClick, isSubItem = false }: { item: NavItem; isActive: boolean; onClick: () => void; isSubItem?: boolean }) => (
        <button
            onClick={onClick}
            className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-left group
        ${isActive
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }
        ${isSubItem ? "py-2 px-3" : ""}`}
        >
            <div className={`shrink-0 grid place-items-center rounded-md transition-colors duration-200
        ${isActive ? "bg-white/20 border border-white/20" : "bg-muted/50 border border-border group-hover:bg-muted group-hover:border-primary/20"}
        ${isSubItem ? "h-6 w-6" : "h-9 w-9"}`}>
                <item.icon size={isSubItem ? 13 : 18} className={isActive ? "stroke-primary-foreground" : "stroke-muted-foreground group-hover:stroke-foreground"} />
            </div>
            <span className={`font-medium tracking-tight leading-snug ${isSubItem ? "text-xs" : "text-sm"}`}>
                {item.label}
            </span>
        </button>
    );

    const getPageTitle = (view: string) => {
        if (view === "Control Center") return "Administrator Dashboard";
        const item = [...mainNavItems, ...adminNavItems].find(i => i.id === view);
        return item ? item.label : view;
    };

    const renderContent = () => {
        const title = getPageTitle(activeView);
        switch (activeView) {
            case "Procurement":
                return <ProcurementView orders={purchaseOrders} onNewOrder={() => setIsAcquisitionModalOpen(true)} onOrderClick={handleOrderClick} onArchiveOrder={handleArchiveOrder} />;
            case "Registration":
                return <RegistrationView key="registration-view" assets={assets.filter(a => a.status !== 'Archived')} categories={assetCategories.filter(c => c.status !== 'Archived')} onRegister={() => setIsModalOpen(true)} onManageCategories={() => setIsCategoryModalOpen(true)} />;
            case "Allocation":
                return <AssetAllocationView assets={assets.filter(a => a.status !== 'Archived')} rooms={rooms} onAllocate={handleAllocateAsset} />;
            case "Maintenance":
                return <MaintenanceView
                    records={maintenanceRecords}
                    assets={assets}
                    onCreateRequest={() => {
                        setSelectedMaintenanceRecord(null);
                        setIsMaintenanceModalOpen(true);
                    }}
                    onRecordClick={handleMaintenanceRecordClick}
                    onArchiveRecord={handleArchiveMaintenanceRecord}
                    onEditRecord={(record) => {
                        setSelectedMaintenanceRecord(record);
                        setIsMaintenanceModalOpen(true);
                    }}
                    onScheduleMaintenance={handleScheduleMaintenance}
                    onUpdateStatus={(id, status) => {
                        setMaintenanceRecords(records => records.map(r => r.id === id ? { ...r, status } : r));
                    }}
                    onRequestReplacement={handleRequestReplacement}
                />;
            case "Depreciation":
                return <DepreciationView assets={assets.filter(a => a.status !== 'Archived')} onAssetClick={handleAssetClick} />;
            case "Room Units":
                return <RoomListView
                    rooms={rooms}
                    roomCategories={roomCategories}
                    onCreateRoom={() => {
                        setSelectedRoom(null);
                        setIsRoomModalOpen(true);
                    }}
                    onManageCategories={() => setIsRoomCategoryModalOpen(true)}
                    onRoomClick={handleRoomClick}
                    onArchiveRoom={handleArchiveRoom}
                />;
            case "Organization":
                return <RolesDashboard roles={roles} employees={employees} onOpenModal={() => setIsRoleModalOpen(true)} onAddPersonnel={() => setIsEmployeeModalOpen(true)} onEmployeeClick={handleEmployeeClick} onArchiveEmployee={handleArchiveEmployee} />;
            default:
                return (
                    <>
                        <AssetStats assets={assets} />
                        <AssetTable assets={assets} onAssetClick={handleAssetClick} onArchiveAsset={handleArchiveAsset} />
                    </>
                );
        }
    };

    return (
        <div className="min-h-screen bg-background flex">
            {/* Sidebar */}
            {/* Desktop Sidebar — hidden on mobile */}
            <div className="hidden lg:flex w-72 h-screen bg-card flex-col fixed left-0 top-0 border-r border-border z-50 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)]">
                {/* Logo */}
                <div className="p-6 flex flex-col items-center shrink-0">
                    <div className="w-full flex items-center justify-center mb-2">
                        <Image src="/d_file.png" alt="DFILE" width={280} height={140} className="w-auto h-32 object-contain" />
                    </div>
                </div>

                <div className="flex-1 px-3 space-y-6 pb-6 overflow-y-auto">
                    {/* Standalone Dashboard */}
                    <div className="pt-2">
                        {(!dashboardNavItem.allowedRoles || dashboardNavItem.allowedRoles.includes(userRole)) && (
                            <NavButton
                                item={dashboardNavItem}
                                isActive={activeView === dashboardNavItem.id}
                                onClick={() => {
                                    setActiveView(dashboardNavItem.id);
                                    if (dashboardNavItem.action) dashboardNavItem.action();
                                }}
                            />
                        )}
                    </div>

                    {/* Asset Management */}
                    <section>
                        <div className="flex items-center gap-2 px-2 mb-2">
                            <span className="w-1 h-3 rounded-full bg-primary/40"></span>
                            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Asset Management</p>
                        </div>
                        <div className="space-y-1">
                            {mainNavItems.filter(item => !item.allowedRoles || item.allowedRoles.includes(userRole)).map((item) => (
                                <NavButton
                                    key={item.id}
                                    item={item}
                                    isActive={activeView === item.id}
                                    onClick={() => {
                                        setActiveView(item.id);
                                        if (item.action) item.action();
                                    }}
                                />
                            ))}
                        </div>
                    </section>

                    {/* Administrator - Only show if there are items to show */}
                    {adminNavItems.some(item => !item.allowedRoles || item.allowedRoles.includes(userRole)) && (
                        <section>
                            <div className="flex items-center gap-2 px-2 mb-2">
                                <span className="w-1 h-3 rounded-full bg-primary/40"></span>
                                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Administrator</p>
                            </div>
                            <div className="space-y-1">
                                {adminNavItems.filter(item => !item.allowedRoles || item.allowedRoles.includes(userRole)).map((item) => (
                                    <NavButton
                                        key={item.id}
                                        item={item}
                                        isActive={activeView === item.id}
                                        onClick={() => {
                                            setActiveView(item.id);
                                            if (item.action) item.action();
                                        }}
                                    />
                                ))}
                            </div>
                        </section>
                    )}
                </div>

                {/* Logout */}
                <div className="p-4 mt-auto border-t border-border bg-card/50 backdrop-blur-sm sticky bottom-0">
                    <Button variant="ghost" onClick={onLogout} className="w-full h-10 rounded-xl border border-border/50 text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-all">
                        <LogOut size={16} className="mr-2" />
                        <span className="font-semibold text-xs uppercase tracking-wider">Terminate Session</span>
                    </Button>
                </div>
            </div>

            {/* Mobile Sidebar — Sheet drawer */}
            <Sheet open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen}>
                <SheetContent side="left" className="w-72 p-0 bg-card" showCloseButton={false}>
                    <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                    <div className="p-6 flex flex-col items-center shrink-0">
                        <div className="w-full flex items-center justify-center mb-2">
                            <Image src="/d_file.png" alt="DFILE" width={200} height={100} className="w-auto h-20 object-contain" />
                        </div>
                    </div>

                    <div className="flex-1 px-3 space-y-6 pb-6 overflow-y-auto">
                        {/* Standalone Dashboard */}
                        <div className="pt-2">
                            {(!dashboardNavItem.allowedRoles || dashboardNavItem.allowedRoles.includes(userRole)) && (
                                <NavButton
                                    item={dashboardNavItem}
                                    isActive={activeView === dashboardNavItem.id}
                                    onClick={() => {
                                        setActiveView(dashboardNavItem.id);
                                        if (dashboardNavItem.action) dashboardNavItem.action();
                                        setIsMobileSidebarOpen(false);
                                    }}
                                />
                            )}
                        </div>

                        <section>
                            <div className="flex items-center gap-2 px-2 mb-2">
                                <span className="w-1 h-3 rounded-full bg-primary/40"></span>
                                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Asset Management</p>
                            </div>
                            <div className="space-y-1">
                                {mainNavItems.filter(item => !item.allowedRoles || item.allowedRoles.includes(userRole)).map((item) => (
                                    <NavButton
                                        key={item.id}
                                        item={item}
                                        isActive={activeView === item.id}
                                        onClick={() => {
                                            setActiveView(item.id);
                                            if (item.action) item.action();
                                            setIsMobileSidebarOpen(false);
                                        }}
                                    />
                                ))}
                            </div>
                        </section>

                        {/* Administrator - Only show if there are items to show */}
                        {adminNavItems.some(item => !item.allowedRoles || item.allowedRoles.includes(userRole)) && (
                            <section>
                                <div className="flex items-center gap-2 px-2 mb-2">
                                    <span className="w-1 h-3 rounded-full bg-primary/40"></span>
                                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Administrator</p>
                                </div>
                                <div className="space-y-1">
                                    {adminNavItems.filter(item => !item.allowedRoles || item.allowedRoles.includes(userRole)).map((item) => (
                                        <NavButton
                                            key={item.id}
                                            item={item}
                                            isActive={activeView === item.id}
                                            onClick={() => {
                                                setActiveView(item.id);
                                                if (item.action) item.action();
                                                setIsMobileSidebarOpen(false);
                                            }}
                                        />
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>

                    <div className="p-4 mt-auto border-t border-border bg-card/50">
                        <Button variant="ghost" onClick={onLogout} className="w-full h-10 rounded-xl border border-border/50 text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-all">
                            <LogOut size={16} className="mr-2" />
                            <span className="font-semibold text-xs uppercase tracking-wider">Terminate Session</span>
                        </Button>
                    </div>
                </SheetContent>
            </Sheet>

            {/* Main Content */}
            <main className="flex-1 ml-0 lg:ml-72 min-w-0 bg-background min-h-screen">
                {/* Header */}
                <header className="h-14 bg-card border-b border-border px-3 sm:px-6 flex items-center justify-between sticky top-0 z-10">
                    {/* Mobile hamburger */}
                    <button
                        onClick={() => setIsMobileSidebarOpen(true)}
                        className="lg:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors mr-2"
                    >
                        <Menu size={20} />
                    </button>

                    {/* Back Button (Visible when not on Dashboard) */}
                    {activeView !== "Control Center" && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setActiveView("Control Center")}
                            className="mr-4 hidden sm:flex text-muted-foreground hover:text-foreground"
                        >
                            <ArrowLeft size={16} className="mr-2" />
                            Back to Dashboard
                        </Button>
                    )}

                    <div className="flex-1 max-w-md hidden sm:block">
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-foreground transition-colors" size={16} />
                            <Input type="text" placeholder="Search assets, serial numbers, or users..." className="pl-9 h-9 text-sm" />
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Separator orientation="vertical" className="h-6" />
                        <ThemeToggle />
                        <button className="relative text-muted-foreground hover:text-foreground transition-colors p-2 rounded-lg">
                            <Bell size={18} />
                            <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-primary rounded-full border-2 border-background" />
                        </button>
                        <div className="flex items-center gap-2.5 pl-1">
                            <div className="text-right hidden md:block">
                                <p className="text-sm font-medium text-foreground leading-tight">{currentUser.name}</p>
                                <p className="text-xs text-muted-foreground">{currentUser.roleLabel}</p>
                            </div>
                            <Avatar className="h-8 w-8 ring-2 ring-primary/30 ring-offset-2 ring-offset-background">
                                <AvatarImage src="/d_file.png" alt="Profile" />
                                <AvatarFallback className="bg-muted text-foreground"><User size={14} /></AvatarFallback>
                            </Avatar>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto pb-20">
                    <div className="mb-6 lg:mb-8">
                        <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-muted rounded-lg mb-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                                {activeView} Protocol Active
                            </p>
                        </div>
                        <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                            {getPageTitle(activeView)}
                        </h1>
                    </div>
                    {renderContent()}
                </div>
            </main>
            {/* Modals */}
            <AssetDetailsModal open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen} asset={selectedAsset} />
            <AddAssetModal open={isModalOpen} onOpenChange={setIsModalOpen} categories={assetCategories.filter(c => c.status !== 'Archived')} onAddAsset={handleAddAsset} />

            <AcquisitionModal
                key={selectedAssetForReplacement ? `acquisition-${selectedAssetForReplacement.id}` : 'acquisition'}
                open={isAcquisitionModalOpen}
                onOpenChange={(open) => {
                    setIsAcquisitionModalOpen(open);
                    if (!open) setSelectedAssetForReplacement(null);
                }}
                categories={assetCategories}
                onCreateOrder={handleCreateOrder}
                replacementAsset={selectedAssetForReplacement}
            />

            <CreateTenantAdminModal open={isTenantModalOpen} onOpenChange={setIsTenantModalOpen} />
            <CreateRoleModal open={isRoleModalOpen} onOpenChange={setIsRoleModalOpen} onSave={handleAddRole} />
            <AddEmployeeModal
                open={isEmployeeModalOpen}
                onOpenChange={(open) => {
                    setIsEmployeeModalOpen(open);
                    if (!open) setSelectedEmployee(null); // Clear selection when closing
                }}
                departments={departments}
                roles={roles}
                onAddEmployee={handleAddEmployee}
                initialData={selectedEmployee}
            />
            <ManageCategoriesModal open={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen} categories={assetCategories} onAddCategory={handleAddAssetCategory} onUpdateCategory={handleUpdateAssetCategory} onArchiveCategory={handleArchiveAssetCategory} />
            <ManageRoomCategoriesModal open={isRoomCategoryModalOpen} onOpenChange={setIsRoomCategoryModalOpen} roomCategories={roomCategories} onAddCategory={handleAddRoomCategory} onUpdateCategory={handleUpdateRoomCategory} onArchiveCategory={handleArchiveRoomCategory} />
            <RoomModal
                open={isRoomModalOpen}
                onOpenChange={(open) => {
                    setIsRoomModalOpen(open);
                    if (!open) setSelectedRoom(null);
                }}
                roomCategories={roomCategories}
                onSave={handleSaveRoom}
                initialData={selectedRoom}
            />


            <CreateMaintenanceModal
                key={selectedMaintenanceRecord ? selectedMaintenanceRecord.id : `create-maintenance-${selectedAssetIdForMaintenance}`}
                open={isMaintenanceModalOpen}
                onOpenChange={(open) => {
                    setIsMaintenanceModalOpen(open);
                    if (!open) {
                        setSelectedMaintenanceRecord(null);
                        setSelectedAssetIdForMaintenance(null);
                    }
                }}
                assets={assets}
                records={maintenanceRecords}
                onAddRecord={handleAddMaintenanceRecord}
                onUpdateRecord={handleUpdateMaintenanceRecord}
                initialData={selectedMaintenanceRecord}
                defaultAssetId={selectedAssetIdForMaintenance}
            />
            <EmployeeDetailsModal
                open={isEmployeeDetailsOpen}
                onOpenChange={setIsEmployeeDetailsOpen}
                employee={selectedEmployee}
                onEdit={handleEditEmployee}
            />
            <OrderDetailsModal open={isOrderDetailsOpen} onOpenChange={setIsOrderDetailsOpen} order={selectedOrder} />
            <MaintenanceDetailsModal
                open={isMaintenanceDetailsOpen}
                onOpenChange={setIsMaintenanceDetailsOpen}
                record={selectedMaintenanceRecord}
                assetName={selectedMaintenanceRecord ? assets.find(a => a.id === selectedMaintenanceRecord.assetId)?.desc : undefined}
                onEdit={() => {
                    setIsMaintenanceDetailsOpen(false);
                    setIsMaintenanceModalOpen(true);
                }}
                onRequestReplacement={(assetId) => {
                    setIsMaintenanceDetailsOpen(false);
                    handleRequestReplacement(assetId);
                }}
            />
        </div>
    );
}
