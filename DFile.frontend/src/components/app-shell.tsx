"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
    LogOut, Menu, Bell, ChevronRight, Settings,
    PanelLeftClose, PanelLeft
} from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { ThemeToggle } from "@/components/theme-toggle";
import { MaintenanceSettingsModal } from "@/components/modals/maintenance-settings-modal";
import { useAuth } from "@/contexts/auth-context";
import { UserRole } from "@/types/asset";
import { getDashboardPath } from "@/lib/role-routing";
import { LoadingScreen } from "@/components/loading-screen";

export interface NavItem {
    href: string;
    label: string;
    icon: React.ElementType;
    allowedRoles?: UserRole[];
}

export interface NavSection {
    label: string;
    items: NavItem[];
}

interface AppShellProps {
    children: React.ReactNode;
    navSections: NavSection[];
    requiredRoles: UserRole[];
    homePath: string;
}

// ─── Nav Item ─────────────────────────────────────────────────────
function NavItemButton({
    item,
    isCollapsed,
    pathname,
    homePath,
    onNavigate,
}: {
    item: NavItem;
    isCollapsed: boolean;
    pathname: string;
    homePath: string;
    onNavigate?: () => void;
}) {
    const normalized = pathname?.endsWith("/") && pathname.length > 1 ? pathname.slice(0, -1) : pathname;
    const isActive =
        item.href === homePath
            ? normalized === homePath
            : normalized === item.href || normalized.startsWith(item.href + "/");

    const button = (
        <Link
            href={item.href}
            prefetch={false}
            onClick={onNavigate}
            className={`group relative flex items-center gap-3 rounded-xl transition-all duration-200 ease-out
                ${isCollapsed ? "h-11 w-11 justify-center mx-auto" : "h-11 px-3.5"}
                ${isActive
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
        >
            {isActive && !isCollapsed && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[var(--amber)] rounded-r-full" />
            )}
            <item.icon
                size={18}
                strokeWidth={isActive ? 2.5 : 2}
                className="shrink-0 transition-colors"
            />
            {!isCollapsed && (
                <span className={`text-sm leading-normal truncate ${isActive ? "font-semibold" : "font-medium"}`}>
                    {item.label}
                </span>
            )}
        </Link>
    );

    if (isCollapsed) {
        return (
            <Tooltip>
                <TooltipTrigger asChild>{button}</TooltipTrigger>
                <TooltipContent side="right" sideOffset={12} className="font-medium">
                    {item.label}
                </TooltipContent>
            </Tooltip>
        );
    }

    return button;
}

// ─── Nav Section ──────────────────────────────────────────────────
function NavSectionBlock({
    section,
    isCollapsed,
    pathname,
    homePath,
    onNavigate,
    userRole,
}: {
    section: NavSection;
    isCollapsed: boolean;
    pathname: string;
    homePath: string;
    onNavigate?: () => void;
    userRole?: UserRole;
}) {
    const visibleItems = userRole
        ? section.items.filter(item => !item.allowedRoles || item.allowedRoles.includes(userRole))
        : section.items;

    if (!visibleItems.length) return null;

    return (
        <div className="space-y-1.5">
            {!isCollapsed && (
                <p className="px-3.5 mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70 select-none">
                    {section.label}
                </p>
            )}
            {isCollapsed && (
                <div className="w-8 h-px bg-border mx-auto mb-2" />
            )}
            <div className="space-y-1">
                {visibleItems.map(item => (
                    <NavItemButton
                        key={item.href}
                        item={item}
                        isCollapsed={isCollapsed}
                        pathname={pathname}
                        homePath={homePath}
                        onNavigate={onNavigate}
                    />
                ))}
            </div>
        </div>
    );
}

// ─── Breadcrumb ───────────────────────────────────────────────────
function Breadcrumb({ pathname, navSections, homePath }: { pathname: string; navSections: NavSection[]; homePath: string }) {
    const normalized = pathname?.endsWith("/") && pathname.length > 1 ? pathname.slice(0, -1) : pathname;
    const allItems = navSections.flatMap(s => s.items);
    const sorted = [...allItems].sort((a, b) => b.href.length - a.href.length);
    const current = sorted.find(i => normalized === i.href || normalized.startsWith(i.href + "/"));
    const label = current?.label ?? "Dashboard";

    if (!current || current.href === homePath) {
        return (
            <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold text-foreground tracking-tight">{label}</h1>
            </div>
        );
    }

    const home = allItems.find(i => i.href === homePath);

    return (
        <nav className="flex items-center gap-2 text-sm">
            {home && (
                <>
                    <Link href={homePath} prefetch={false} className="text-muted-foreground hover:text-foreground transition-colors font-medium">
                        {home.label}
                    </Link>
                    <ChevronRight size={14} className="text-muted-foreground/50" />
                </>
            )}
            <span className="font-semibold text-foreground">{label}</span>
        </nav>
    );
}

// ─── Sidebar Content ──────────────────────────────────────────────
function SidebarContent({
    user,
    isCollapsed,
    pathname,
    homePath,
    navSections,
    onNavigate,
}: {
    user: { firstName: string; lastName: string; role: UserRole; roleLabel: string };
    isCollapsed: boolean;
    pathname: string;
    homePath: string;
    navSections: NavSection[];
    onNavigate?: () => void;
}) {
    const userRole = user.role;
    return (
        <div className="flex flex-col h-full">
            {/* Logo Area */}
            <div className={`flex items-center shrink-0 border-b border-border/60 ${isCollapsed ? "h-16 justify-center px-2" : "h-16 px-5"}`}>
                {!isCollapsed ? (
                    <Link href={homePath} prefetch={false} className="flex items-center">
                        <Image src="/d_file.svg" alt="DFile" width={110} height={36} className="h-8 w-auto object-contain" priority />
                    </Link>
                ) : (
                    <Link href={homePath} prefetch={false} className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
                        <span className="text-primary font-bold text-sm">DF</span>
                    </Link>
                )}
            </div>

            {/* Navigation */}
            <nav className={`flex-1 overflow-y-auto overflow-x-hidden py-6 space-y-6 ${isCollapsed ? "px-2" : "px-3"}`}>
                {navSections.map(section => (
                    <NavSectionBlock
                        key={section.label}
                        section={section}
                        isCollapsed={isCollapsed}
                        pathname={pathname}
                        homePath={homePath}
                        onNavigate={onNavigate}
                        userRole={userRole}
                    />
                ))}
            </nav>

            {/* User Profile — bottom of sidebar, border-top separator */}
            <div className={`shrink-0 border-t border-border/60 ${isCollapsed ? "p-2" : "p-3"}`}>
                <div
                    className={`flex items-center gap-3 w-full rounded-xl p-2.5
                        ${isCollapsed ? "justify-center" : ""}`}
                >
                    <Avatar className="h-9 w-9 shrink-0">
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                            {((user.firstName?.[0] ?? '') + (user.lastName?.[0] ?? '')).toUpperCase() || '?'}
                        </AvatarFallback>
                    </Avatar>
                    {!isCollapsed && (
                        <div className="flex-1 text-left min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">{user.firstName ?? ''} {user.lastName ?? ''}</p>
                            <p className="text-xs text-muted-foreground truncate">{user.roleLabel}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── AppShell ─────────────────────────────────────────────────────
export function AppShell({ children, navSections, requiredRoles, homePath }: AppShellProps) {
    const { user, logout, isLoggedIn, isLoading, isLoggingOut } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isLogoutOpen, setIsLogoutOpen] = useState(false);
    // Prevent double-navigation in race conditions.
    const isRedirectingRef = useRef(false);

    useEffect(() => {
        if (isLoading) return;
        if (isRedirectingRef.current) return;

        if (!isLoggedIn) {
            // Only push if we aren't already on /login
            if (!pathname.startsWith("/login")) {
                isRedirectingRef.current = true;
                router.push("/login");
            }
            return;
        }
        if (user && !requiredRoles.includes(user.role)) {
            const dest = getDashboardPath(user.role);
            if (dest !== "/login" && !pathname.startsWith(dest)) {
                isRedirectingRef.current = true;
                router.replace(dest);
            }
        }
    // user, router intentionally omitted — user changes on every background
    // /api/auth/me refresh (new object ref) and would re-trigger navigations.
    // isLoggedIn changing is the only meaningful auth signal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isLoading, isLoggedIn, pathname, requiredRoles]);

    if (isLoggingOut) return <LoadingScreen message="Signing you out…" />;
    if (isLoading || !user) return <LoadingScreen message="Loading…" />;
    if (!requiredRoles.includes(user.role)) return null;

    return (
        <TooltipProvider delayDuration={100}>
            <div className="min-h-screen bg-background flex">

                {/* ── Desktop Sidebar ── */}
                <aside className={`hidden lg:flex flex-col fixed left-0 top-0 bottom-0 z-40 bg-sidebar border-r border-border
                    transition-[width] duration-300 ease-out
                    ${isCollapsed ? "w-[72px]" : "w-[260px]"}`}
                >
                    <SidebarContent
                        user={user}
                        isCollapsed={isCollapsed}
                        pathname={pathname}
                        homePath={homePath}
                        navSections={navSections}
                    />
                </aside>

                {/* ── Mobile Sidebar ── */}
                <Sheet open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen}>
                    <SheetContent side="left" className="w-[280px] p-0 bg-sidebar border-0" showCloseButton={false}>
                        <SheetTitle className="sr-only">Navigation</SheetTitle>
                        <SidebarContent
                            user={user}
                            isCollapsed={false}
                            pathname={pathname}
                            homePath={homePath}
                            navSections={navSections}
                            onNavigate={() => setIsMobileSidebarOpen(false)}
                        />
                    </SheetContent>
                </Sheet>

                {/* ── Main Content Area ── */}
                <div className={`flex-1 flex flex-col min-w-0 min-h-screen transition-[margin] duration-300 ease-out
                    ${isCollapsed ? "lg:ml-[72px]" : "lg:ml-[260px]"}`}>

                    {/* Header — fixed (not sticky) so Radix scroll-lock / focus / flex layout cannot detach it from the viewport */}
                    <header
                        data-app-shell-header
                        className={`fixed top-0 right-0 left-0 z-30 h-[72px] bg-background/95 backdrop-blur-md border-b border-border/50 flex items-center px-6 sm:px-8 gap-4 shrink-0 transition-[left] duration-300 ease-out
                            ${isCollapsed ? "lg:left-[72px]" : "lg:left-[260px]"}`}
                    >
                        {/* Mobile: open drawer */}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 lg:hidden text-muted-foreground hover:text-foreground hover:bg-accent"
                            onClick={() => setIsMobileSidebarOpen(true)}
                            aria-label="Open menu"
                        >
                            <Menu size={20} />
                        </Button>

                        {/* Desktop: collapse / expand sidebar — lives in header per HCI convention */}
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-9 w-9 hidden lg:flex text-muted-foreground hover:text-foreground hover:bg-accent"
                                    onClick={() => setIsCollapsed(v => !v)}
                                    aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                                >
                                    {isCollapsed ? <PanelLeft size={18} /> : <PanelLeftClose size={18} />}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom">{isCollapsed ? "Expand sidebar" : "Collapse sidebar"}</TooltipContent>
                        </Tooltip>

                        <div className="flex-1 min-w-0">
                            <Breadcrumb pathname={pathname} navSections={navSections} homePath={homePath} />
                        </div>

                        <div className="flex items-center gap-2">
                            <ThemeToggle />

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-accent"
                                        onClick={() => setIsSettingsModalOpen(true)}
                                        aria-label="Maintenance Settings"
                                    >
                                        <Settings size={18} />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom">Maintenance Settings</TooltipContent>
                            </Tooltip>

                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-9 w-9 relative text-muted-foreground hover:text-foreground hover:bg-accent"
                                aria-label="Notifications"
                            >
                                <Bell size={18} />
                                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[var(--amber)] ring-2 ring-background" />
                            </Button>

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 hover:bg-accent transition-colors ml-1">
                                        <Avatar className="h-8 w-8">
                                            <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                                                {((user.firstName?.[0] ?? '') + (user.lastName?.[0] ?? '')).toUpperCase() || '?'}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="text-left hidden sm:block">
                                            <p className="text-sm font-semibold text-foreground leading-tight">{user.firstName ?? ''} {user.lastName ?? ''}</p>
                                            <p className="text-xs text-muted-foreground leading-tight">{user.roleLabel}</p>
                                        </div>
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56 z-[200]">
                                    <DropdownMenuLabel className="font-normal px-3 py-2">
                                        <p className="text-sm font-semibold">{user.firstName ?? ''} {user.lastName ?? ''}</p>
                                        <p className="text-xs text-muted-foreground">{user.roleLabel}</p>
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        onClick={() => setIsLogoutOpen(true)}
                                        className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer mx-1 rounded-lg"
                                    >
                                        <LogOut size={15} className="mr-2" />
                                        Sign out
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </header>

                    {/* Page Content — top padding reserves space for fixed header (matches previous py-8 + in-flow header) */}
                    <main className="flex-1 px-4 sm:px-6 lg:px-8 pt-[calc(72px+2rem)] pb-8 w-full max-w-[1400px] mx-auto min-h-0">
                        {children}
                    </main>
                </div>
            </div>

            {/* ── Logout Confirmation Dialog ── */}
            <Dialog open={isLogoutOpen} onOpenChange={setIsLogoutOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-xl">Sign Out</DialogTitle>
                        <DialogDescription className="text-muted-foreground">
                            Are you sure you want to sign out of DFile? Any unsaved changes will be lost.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-3 sm:gap-2 mt-2">
                        <Button variant="outline" onClick={() => setIsLogoutOpen(false)} className="flex-1 sm:flex-none">
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => { logout(); setIsLogoutOpen(false); }}
                            className="flex-1 sm:flex-none"
                        >
                            <LogOut size={16} className="mr-2" />
                            Sign Out
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Maintenance Settings Modal ── */}
            <MaintenanceSettingsModal 
                open={isSettingsModalOpen} 
                onOpenChange={setIsSettingsModalOpen} 
            />
        </TooltipProvider>
    );
}
