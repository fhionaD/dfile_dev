"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
    LayoutDashboard, ShoppingCart, QrCode, UserCheck, Wrench,
    TrendingDown, LogOut, LayoutGrid,
    DoorOpen, Building2, Menu, ArrowLeft, Search, Bell, User
} from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/contexts/auth-context";
import { UserRole } from "@/types/asset";

interface NavItem {
    href: string;
    label: string;
    icon: React.ElementType;
    allowedRoles?: UserRole[];
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { user, logout, isLoggedIn, tenant, isLoading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);

    // Build nav items, filtering based on subscription plan
    const mainNavItems: NavItem[] = useMemo(() => [
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }, // Allowed for all
        { href: "/dashboard/procurement", label: "Asset Acquisition / Purchase", icon: ShoppingCart, allowedRoles: ['Admin', 'Tenant Admin', 'Procurement', 'Finance', 'Super Admin'] },
        { href: "/dashboard/inventory", label: "Asset Registration & Tagging", icon: QrCode, allowedRoles: ['Admin', 'Tenant Admin', 'Procurement', 'Maintenance', 'Super Admin'] },
        { href: "/dashboard/asset-categories", label: "Asset Categories", icon: LayoutGrid, allowedRoles: ['Admin', 'Tenant Admin', 'Procurement', 'Maintenance', 'Super Admin'] },
        { href: "/dashboard/allocation", label: "Asset Allocation / Assignment", icon: UserCheck, allowedRoles: ['Admin', 'Tenant Admin', 'Super Admin'] },
        { href: "/dashboard/depreciation", label: "Asset Depreciation", icon: TrendingDown, allowedRoles: ['Admin', 'Tenant Admin', 'Finance', 'Super Admin'] },
        // Only show Maintenance if subscription allows it (or no tenant = Super Admin)
        ...((!tenant || tenant.maintenanceModule) ? [
            { href: "/dashboard/maintenance", label: "Asset Maintenance & Repair", icon: Wrench, allowedRoles: ['Admin', 'Tenant Admin', 'Maintenance', 'Super Admin'] as UserRole[] },
        ] : []),
        { href: "/dashboard/tasks", label: "Task Management", icon: LayoutGrid, allowedRoles: ['Admin', 'Tenant Admin', 'Maintenance', 'Super Admin'] },
    ], [tenant]);

    const adminNavItems: NavItem[] = useMemo(() => [
        { href: "/dashboard/rooms", label: "Room Units", icon: DoorOpen, allowedRoles: ['Admin', 'Tenant Admin', 'Super Admin'] },
        { href: "/dashboard/organization", label: "Organization", icon: Building2, allowedRoles: ['Admin', 'Tenant Admin', 'Super Admin'] },
    ], []);

    const superAdminNavItems: NavItem[] = useMemo(() => [
        { href: "/dashboard/super-admin/dashboard", label: "Super Admin Control", icon: UserCheck, allowedRoles: ['Super Admin'] },
        { href: "/dashboard/super-admin/create-tenant", label: "Create Tenant", icon: Building2, allowedRoles: ['Super Admin'] },
    ], []);

    const allNavItems = useMemo(() => [...mainNavItems, ...adminNavItems, ...superAdminNavItems], [mainNavItems, adminNavItems, superAdminNavItems]);

    useEffect(() => {
        if (!isLoading && !isLoggedIn) {
            router.replace("/login");
            return;
        }

        if (!isLoading && isLoggedIn && user) {
            if (user.mustChangePassword && pathname !== "/dashboard/change-password") {
                router.replace("/dashboard/change-password");
                return;
            }
            if (!user.mustChangePassword && pathname === "/dashboard/change-password") {
                router.replace("/dashboard");
                return;
            }
        }

        // Route Protection
        if (pathname === "/dashboard") return;

        const currentItem = allNavItems.find(item => item.href === pathname);

        if (currentItem && currentItem.allowedRoles && user && !currentItem.allowedRoles.includes(user.role)) {
            router.replace("/dashboard");
        }
    }, [isLoggedIn, pathname, user, allNavItems, isLoading]); // eslint-disable-line react-hooks/exhaustive-deps

    if (!user) return null; // Or a loading spinner



    const NavButton = ({ item, isSubItem = false }: { item: NavItem; isSubItem?: boolean }) => {
        // Strict active check to avoid partial matches on root path being active for subpaths
        // Normalize pathname by removing trailing slash for consistent comparison
        const normalizedPath = pathname?.endsWith('/') && pathname.length > 1 ? pathname.slice(0, -1) : pathname;

        const isActive = item.href === "/dashboard"
            ? normalizedPath === "/dashboard"
            : normalizedPath.startsWith(item.href);

        const activeClasses = "bg-primary text-primary-foreground shadow-md shadow-primary/20 ring-1 ring-primary-foreground/20 font-medium";
        const inactiveClasses = "text-muted-foreground hover:text-foreground hover:bg-muted font-normal";

        return (
            <Link
                href={item.href}
                onClick={() => setIsMobileSidebarOpen(false)}
                className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left group
                ${isActive ? activeClasses : inactiveClasses}
                ${isSubItem ? "py-2 px-3" : ""}
                ${isCollapsed ? "justify-center px-2" : ""}`}
                title={isCollapsed ? item.label : undefined}
            >
                <div className={`shrink-0 grid place-items-center rounded-md
                ${isActive ? "bg-white/20 border border-white/20" : "bg-muted/50 border border-border group-hover:bg-muted group-hover:border-primary/20"}
                ${isSubItem ? "h-6 w-6" : "h-9 w-9"}`}>
                    <item.icon size={isSubItem ? 13 : 18} className={isActive ? "stroke-primary-foreground" : "stroke-muted-foreground group-hover:stroke-foreground"} />
                </div>
                {!isCollapsed && (
                    <span className={`tracking-tight leading-snug flex-1 ${isSubItem ? "text-xs" : "text-sm"}`}>
                        {item.label}
                    </span>
                )}
            </Link>
        );
    };

    const getPageTitle = () => {
        const allItems = [...mainNavItems, ...adminNavItems];
        const sortedItems = [...allItems].sort((a, b) => b.href.length - a.href.length);
        const current = sortedItems.find(i => pathname.startsWith(i.href));
        return current ? current.label : "Dashboard";
    };

    // Debugging logic to diagnose why header isn't hiding
    // useEffect(() => {
    //     console.log('Layout Debug:', { pathname, role: user?.role });
    // }, [pathname, user]);

    return (
        <div className="min-h-screen bg-background flex">
            {/* Desktop Sidebar */}
            <div className={`hidden lg:flex ${isCollapsed ? "w-20" : "w-72"} h-screen bg-card flex-col fixed left-0 top-0 border-r border-border z-50 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)] transition-all duration-300`}>
                <div className={`p-4 flex ${isCollapsed ? "flex-col gap-4" : "flex-row justify-between"} items-center shrink-0`}>
                    {!isCollapsed && (
                        <div className="flex items-center justify-center">
                            {/* Ensure image exists or fallback */}
                            <Image src="/d_file.svg" alt="DFILE" width={180} height={90} className="w-auto h-24 object-contain" priority />
                        </div>
                    )}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="text-muted-foreground hover:text-foreground"
                    >
                        <Menu size={20} />
                    </Button>
                </div>

                <div className="flex-1 px-3 space-y-6 pb-6 overflow-y-auto overflow-x-hidden">
                    <section>
                        {!isCollapsed && (
                            <div className="flex items-center gap-2 px-2 mb-2">
                                <span className="w-1 h-3 rounded-full bg-primary/40"></span>
                                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Asset Management</p>
                            </div>
                        )}
                        <div className="space-y-1">
                            {mainNavItems.filter(item => !item.allowedRoles || item.allowedRoles.includes(user.role)).map((item) => (
                                <NavButton key={item.href} item={item} />
                            ))}
                        </div>
                    </section>

                    {adminNavItems.some(item => !item.allowedRoles || item.allowedRoles.includes(user.role)) && (
                        <section>
                            {!isCollapsed && (
                                <div className="flex items-center gap-2 px-2 mb-2">
                                    <span className="w-1 h-3 rounded-full bg-primary/40"></span>
                                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Administrator</p>
                                </div>
                            )}
                            <div className="space-y-1">
                                {adminNavItems.filter(item => !item.allowedRoles || item.allowedRoles.includes(user.role)).map((item) => (
                                    <NavButton key={item.href} item={item} />
                                ))}
                            </div>
                        </section>
                    )}

                    {superAdminNavItems.some(item => !item.allowedRoles || item.allowedRoles.includes(user.role)) && (
                        <section>
                            {!isCollapsed && (
                                <div className="flex items-center gap-2 px-2 mb-2">
                                    <span className="w-1 h-3 rounded-full bg-primary/40"></span>
                                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">SUPER ADMIN</p>
                                </div>
                            )}
                            <div className="space-y-1">
                                {superAdminNavItems.filter(item => !item.allowedRoles || item.allowedRoles.includes(user.role)).map((item) => (
                                    <NavButton key={item.href} item={item} />
                                ))}
                            </div>
                        </section>
                    )}
                </div>

                <div className="p-4 mt-auto border-t border-border bg-card/50 backdrop-blur-sm sticky bottom-0">
                    <Button variant="ghost" onClick={logout} className={`w-full h-10 rounded-xl border border-border/50 text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-all ${isCollapsed ? "px-0 justify-center" : ""}`}>
                        <LogOut size={16} className={isCollapsed ? "" : "mr-2"} />
                        {!isCollapsed && <span className="font-semibold text-xs uppercase tracking-wider">Terminate Session</span>}
                    </Button>
                </div>
            </div>

            {/* Mobile Sidebar */}
            <Sheet open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen}>
                <SheetContent side="left" className="w-72 p-0 bg-card" showCloseButton={false}>
                    <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                    <div className="p-6 flex flex-col items-center shrink-0">
                        <div className="w-full flex items-center justify-center mb-2">
                            <Image src="/d_file.svg" alt="DFILE" width={200} height={100} className="w-auto h-20 object-contain" />
                        </div>
                    </div>

                    <div className="flex-1 px-3 space-y-6 pb-6 overflow-y-auto">
                        <section>
                            <div className="flex items-center gap-2 px-2 mb-2">
                                <span className="w-1 h-3 rounded-full bg-primary/40"></span>
                                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Asset Management</p>
                            </div>
                            <div className="space-y-1">
                                {mainNavItems.filter(item => !item.allowedRoles || item.allowedRoles.includes(user.role)).map((item) => (
                                    <NavButton key={item.href} item={item} />
                                ))}
                            </div>
                        </section>

                        {adminNavItems.some(item => !item.allowedRoles || item.allowedRoles.includes(user.role)) && (
                            <section>
                                <div className="flex items-center gap-2 px-2 mb-2">
                                    <span className="w-1 h-3 rounded-full bg-primary/40"></span>
                                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Administrator</p>
                                </div>
                                <div className="space-y-1">
                                    {adminNavItems.filter(item => !item.allowedRoles || item.allowedRoles.includes(user.role)).map((item) => (
                                        <NavButton key={item.href} item={item} />
                                    ))}
                                </div>
                            </section>
                        )}

                        {superAdminNavItems.some(item => !item.allowedRoles || item.allowedRoles.includes(user.role)) && (
                            <section>
                                <div className="flex items-center gap-2 px-2 mb-2">
                                    <span className="w-1 h-3 rounded-full bg-primary/40"></span>
                                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">SUPER ADMIN</p>
                                </div>
                                <div className="space-y-1">
                                    {superAdminNavItems.filter(item => !item.allowedRoles || item.allowedRoles.includes(user.role)).map((item) => (
                                        <NavButton key={item.href} item={item} />
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>

                    <div className="p-4 mt-auto border-t border-border bg-card/50">
                        <Button variant="ghost" onClick={logout} className="w-full h-10 rounded-xl border border-border/50 text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-all">
                            <LogOut size={16} className="mr-2" />
                            <span className="font-semibold text-xs uppercase tracking-wider">Terminate Session</span>
                        </Button>
                    </div>
                </SheetContent>
            </Sheet>

            {/* Main Content */}
            <main className={`flex-1 min-w-0 bg-background min-h-screen transition-all duration-300 ${isCollapsed ? "lg:ml-20" : "lg:ml-72"}`}>
                <header className="h-14 bg-card border-b border-border !px-3 sm:!px-6 flex items-center justify-between sticky top-0 z-10 w-full">
                    <button
                        onClick={() => setIsMobileSidebarOpen(true)}
                        className="lg:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors mr-2"
                    >
                        <Menu size={20} />
                    </button>

                    <div className="flex-1 max-w-md hidden sm:block">
                        {/* Search removed */}
                    </div>

                    <div className="flex items-center gap-3">
                        <Separator orientation="vertical" className="h-6" />
                        <ThemeToggle />
                        <button className="relative text-muted-foreground hover:text-foreground transition-colors p-2 rounded-lg">
                            <Bell size={18} />
                            <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-primary rounded-full border-2 border-background" />
                        </button>
                        <div className="flex items-center gap-2.5 pl-1">
                            <div className="text-right hidden md:block group cursor-pointer" onClick={() => router.push("/dashboard/change-password")}>
                                <p className="text-sm font-medium text-foreground leading-tight group-hover:text-primary transition-colors">{user.name}</p>
                                <p className="text-xs text-muted-foreground group-hover:text-primary/70 transition-colors">{user.roleLabel} • <span className="underline decoration-dotted">Settings</span></p>
                            </div>
                            <Avatar className="h-8 w-8 ring-2 ring-primary/30 ring-offset-2 ring-offset-background">
                                {/* <AvatarImage src="/d_file.png" alt="Profile" /> */}
                                <AvatarFallback className="bg-muted text-foreground"><User size={14} /></AvatarFallback>
                            </Avatar>
                        </div>
                    </div>
                </header>

                <div className="px-4 sm:px-6 lg:px-8 pt-4 pb-20 max-w-[1400px] mx-auto">
                    {/* Hide Dashboard header for specific roles on root page as they have custom dashboard headers */}
                    {!(pathname === '/dashboard' && (user?.role === 'Finance' || user?.role === 'Employee')) && (
                        <div className="mb-4">
                            <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                                {getPageTitle()}
                            </h1>
                        </div>
                    )}
                    {children}
                </div>
            </main>
        </div>
    );
}
