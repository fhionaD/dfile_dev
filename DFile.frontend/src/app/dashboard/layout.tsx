"use client";

import { useState, useEffect } from "react";
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
    const { user, logout, isLoggedIn } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

    const mainNavItems: NavItem[] = [
        { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }, // Allowed for all
        { href: "/dashboard/procurement", label: "Asset Acquisition / Purchase", icon: ShoppingCart, allowedRoles: ['Admin', 'Procurement', 'Super Admin'] },
        { href: "/dashboard/inventory", label: "Asset Registration & Tagging", icon: QrCode, allowedRoles: ['Admin', 'Procurement', 'Super Admin'] },
        { href: "/dashboard/allocation", label: "Asset Allocation / Assignment", icon: UserCheck, allowedRoles: ['Admin', 'Super Admin'] },
        { href: "/dashboard/depreciation", label: "Asset Deprecation", icon: TrendingDown, allowedRoles: ['Admin', 'Finance', 'Super Admin'] },
        { href: "/dashboard/maintenance", label: "Asset Maintenance & Repair", icon: Wrench, allowedRoles: ['Admin', 'Maintenance', 'Super Admin'] },
        { href: "/dashboard/tasks", label: "Task Management", icon: LayoutGrid, allowedRoles: ['Admin', 'Maintenance', 'Super Admin'] },
    ];

    const adminNavItems: NavItem[] = [
        { href: "/dashboard/rooms", label: "Room Units", icon: DoorOpen, allowedRoles: ['Admin', 'Super Admin'] },
        { href: "/dashboard/organization", label: "Organization", icon: Building2, allowedRoles: ['Admin', 'Super Admin'] },
        { href: "/dashboard/super-admin/dashboard", label: "Super Admin Control", icon: UserCheck, allowedRoles: ['Super Admin'] },
    ];

    const allNavItems = [...mainNavItems, ...adminNavItems];

    useEffect(() => {
        if (!isLoggedIn) {
            router.push("/login");
            return;
        }

        // Route Protection
        // 1. Find the nav item that matches the current path
        //    (We check if pathname starts with the item href to handle potential sub-routes, 
        //     but exact match is safer for this flat structure, or strict prefix)
        //    For now, exact match or simple parent check.
        //    Actually, /dashboard is allowed for everyone in the list, but we need to check specific pages.

        // Skip check for root dashboard as it's the fallback
        if (pathname === "/dashboard") return;

        const currentItem = allNavItems.find(item => item.href === pathname);

        if (currentItem && currentItem.allowedRoles && user && !currentItem.allowedRoles.includes(user.role)) {
            // Unauthorized
            router.push("/dashboard");
            // You might want to show a toast here
        }
    }, [isLoggedIn, router, pathname, user, allNavItems]);

    if (!user) return null; // Or a loading spinner



    const NavButton = ({ item, isSubItem = false }: { item: NavItem; isSubItem?: boolean }) => {
        const isActive = pathname === item.href;
        return (
            <Link
                href={item.href}
                onClick={() => setIsMobileSidebarOpen(false)}
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
            </Link>
        );
    };

    const getPageTitle = () => {
        const allItems = [...mainNavItems, ...adminNavItems];
        const current = allItems.find(i => i.href === pathname);
        return current ? current.label : "Dashboard";
    };

    return (
        <div className="min-h-screen bg-background flex">
            {/* Desktop Sidebar */}
            <div className="hidden lg:flex w-72 h-screen bg-card flex-col fixed left-0 top-0 border-r border-border z-50 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)]">
                <div className="p-6 flex flex-col items-center shrink-0">
                    <div className="w-full flex items-center justify-center mb-2">
                        {/* Ensure image exists or fallback */}
                        <Image src="/d_file.svg" alt="DFILE" width={280} height={140} className="w-auto h-32 object-contain" priority />
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
                </div>

                <div className="p-4 mt-auto border-t border-border bg-card/50 backdrop-blur-sm sticky bottom-0">
                    <Button variant="ghost" onClick={logout} className="w-full h-10 rounded-xl border border-border/50 text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-all">
                        <LogOut size={16} className="mr-2" />
                        <span className="font-semibold text-xs uppercase tracking-wider">Terminate Session</span>
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
            <main className="flex-1 ml-0 lg:ml-72 min-w-0 bg-background min-h-screen">
                <header className="h-14 bg-card border-b border-border px-3 sm:px-6 flex items-center justify-between sticky top-0 z-10">
                    <button
                        onClick={() => setIsMobileSidebarOpen(true)}
                        className="lg:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors mr-2"
                    >
                        <Menu size={20} />
                    </button>

                    <div className="flex-1 max-w-md hidden sm:block">
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-foreground transition-colors" size={16} />
                            <Input type="text" placeholder="Search assets..." className="pl-9 h-9 text-sm" />
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
                                <p className="text-sm font-medium text-foreground leading-tight">{user.name}</p>
                                <p className="text-xs text-muted-foreground">{user.roleLabel}</p>
                            </div>
                            <Avatar className="h-8 w-8 ring-2 ring-primary/30 ring-offset-2 ring-offset-background">
                                {/* <AvatarImage src="/d_file.png" alt="Profile" /> */}
                                <AvatarFallback className="bg-muted text-foreground"><User size={14} /></AvatarFallback>
                            </Avatar>
                        </div>
                    </div>
                </header>

                <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto pb-20">
                    <div className="mb-6 lg:mb-8">
                        <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-muted rounded-lg mb-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                                System Active
                            </p>
                        </div>
                        <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                            {getPageTitle()}
                        </h1>
                    </div>
                    {children}
                </div>
            </main>
        </div>
    );
}
