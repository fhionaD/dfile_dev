"use client";

import { Search, Archive, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Matches Registration & Tagging → Inventory List toolbar rhythm. */
export function DataTableToolbar({
    left,
    right,
    className,
}: {
    left: React.ReactNode;
    right: React.ReactNode;
    className?: string;
}) {
    return (
        <div
            className={cn(
                "flex flex-col gap-4 p-6 lg:flex-row lg:items-center lg:justify-between",
                className,
            )}
        >
            <div className="flex w-full flex-1 flex-wrap items-center gap-3 lg:w-auto">{left}</div>
            <div className="flex w-full flex-wrap items-center justify-end gap-3 lg:w-auto">{right}</div>
        </div>
    );
}

export function DataTableSearch({
    value,
    onChange,
    placeholder,
    ariaLabel,
    className,
}: {
    value: string;
    onChange: (v: string) => void;
    placeholder: string;
    ariaLabel: string;
    className?: string;
}) {
    return (
        <div
            className={cn(
                "relative w-full min-w-[200px] max-w-[320px] shrink-0",
                className,
            )}
        >
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="h-10 rounded-lg pl-10"
                aria-label={ariaLabel}
            />
        </div>
    );
}

/**
 * Single toggle (outline when viewing actives, solid when viewing archive) — original toolbar look.
 * With counts: "Archive (10)" to open archived items, "Actives (20)" to return to active list.
 */
export function ArchiveViewToggleButton({
    showArchived,
    onToggle,
    activeCount,
    archivedCount,
}: {
    showArchived: boolean;
    onToggle: () => void;
    activeCount?: number;
    archivedCount?: number;
}) {
    const archiveLabel =
        archivedCount !== undefined ? `Archive (${archivedCount})` : "View archived";
    const activesLabel =
        activeCount !== undefined ? `Actives (${activeCount})` : "View active";

    return (
        <Button
            type="button"
            variant={showArchived ? "default" : "outline"}
            size="sm"
            className="h-10 min-w-[148px] justify-center rounded-lg px-4 sm:min-w-[160px]"
            onClick={onToggle}
        >
            {showArchived ? (
                <>
                    <RotateCcw size={16} className="mr-2 shrink-0" />
                    {activesLabel}
                </>
            ) : (
                <>
                    <Archive size={16} className="mr-2 shrink-0" />
                    {archiveLabel}
                </>
            )}
        </Button>
    );
}

/** Primary actions (Create / Register / Define …) — consistent height & minimum width. */
export function DataTablePrimaryButton({
    className,
    children,
    ...props
}: React.ComponentProps<typeof Button>) {
    return (
        <Button type="button" size="sm" className={cn("h-10 min-w-[120px] rounded-lg px-4", className)} {...props}>
            {children}
        </Button>
    );
}

export const dataTableFilterTriggerClass = "h-10 w-[150px] min-w-[140px] shrink-0 rounded-lg";

/** Alias for product/docs that refer to “TableControls” — same layout as Inventory List toolbar. */
export { DataTableToolbar as TableControls };
