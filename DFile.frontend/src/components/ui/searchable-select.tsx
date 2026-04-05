"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export interface SearchableSelectOption {
    value: string;
    label: string;
    keywords?: string;
}

interface SearchableSelectProps {
    value: string;
    onValueChange: (value: string) => void;
    options: SearchableSelectOption[];
    placeholder?: string;
    searchPlaceholder?: string;
    emptyMessage?: string;
    disabled?: boolean;
    className?: string;
    id?: string;
    "aria-label"?: string;
    "aria-labelledby"?: string;
    "aria-required"?: boolean;
}

export function SearchableSelect({
    value,
    onValueChange,
    options,
    placeholder = "Select…",
    searchPlaceholder = "Search…",
    emptyMessage = "No matches.",
    disabled = false,
    className,
    id: idProp,
    "aria-label": ariaLabel,
    "aria-labelledby": ariaLabelledBy,
    "aria-required": ariaRequired,
}: SearchableSelectProps) {
    const reactId = useId();
    const listId = `${reactId}-listbox`;
    const inputId = `${reactId}-search`;
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [highlighted, setHighlighted] = useState(0);
    const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return options;
        return options.filter((o) => {
            const hay = `${o.label} ${o.keywords ?? ""}`.toLowerCase();
            return hay.includes(q);
        });
    }, [options, query]);

    const activeIndex =
        filtered.length === 0 ? 0 : Math.min(Math.max(0, highlighted), filtered.length - 1);

    const selectedLabel = options.find((o) => o.value === value)?.label;

    const handleOpenChange = useCallback(
        (next: boolean) => {
            setOpen(next);
            if (next) {
                setQuery("");
                const idx = options.findIndex((o) => o.value === value);
                setHighlighted(idx >= 0 ? idx : 0);
            }
        },
        [options, value],
    );

    const selectIndex = useCallback(
        (i: number) => {
            const opt = filtered[i];
            if (!opt) return;
            onValueChange(opt.value);
            setOpen(false);
            setQuery("");
        },
        [filtered, onValueChange],
    );

    const onKeyDownTrigger = (e: React.KeyboardEvent) => {
        if (disabled) return;
        if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleOpenChange(true);
        }
    };

    const onKeyDownList = (e: React.KeyboardEvent) => {
        if (filtered.length === 0) return;
        const max = filtered.length - 1;
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlighted((h) => Math.min(h + 1, max));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlighted((h) => Math.max(h - 1, 0));
        } else if (e.key === "Enter") {
            e.preventDefault();
            selectIndex(activeIndex);
        } else if (e.key === "Escape") {
            e.preventDefault();
            handleOpenChange(false);
        } else if (e.key === "Home") {
            e.preventDefault();
            setHighlighted(0);
        } else if (e.key === "End") {
            e.preventDefault();
            setHighlighted(max);
        }
    };

    useEffect(() => {
        if (!open) return;
        const el = itemRefs.current[activeIndex];
        el?.scrollIntoView({ block: "nearest" });
    }, [activeIndex, open]);

    return (
        <Popover open={open} onOpenChange={handleOpenChange}>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    aria-controls={listId}
                    aria-haspopup="listbox"
                    aria-label={ariaLabel}
                    aria-labelledby={ariaLabelledBy}
                    aria-required={ariaRequired}
                    id={idProp}
                    disabled={disabled}
                    className={cn("h-10 w-full justify-between px-3 font-normal", className)}
                    onKeyDown={onKeyDownTrigger}
                >
                    <span className={cn("truncate text-left", !selectedLabel && "text-muted-foreground")}>
                        {selectedLabel ?? placeholder}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" aria-hidden />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
                <div className="flex flex-col gap-0 border-b p-2">
                    <Input
                        id={inputId}
                        placeholder={searchPlaceholder}
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setHighlighted(0);
                        }}
                        className="h-9"
                        autoComplete="off"
                        aria-autocomplete="list"
                        aria-controls={listId}
                        onKeyDown={onKeyDownList}
                    />
                </div>
                <ScrollArea className="h-[min(280px,var(--radix-popover-content-available-height))]">
                    <ul
                        id={listId}
                        role="listbox"
                        aria-label={ariaLabel ?? "Options"}
                        className="p-1"
                        tabIndex={-1}
                        onKeyDown={onKeyDownList}
                    >
                        {filtered.length === 0 ? (
                            <li className="px-3 py-6 text-center text-sm text-muted-foreground">{emptyMessage}</li>
                        ) : (
                            filtered.map((opt, i) => {
                                const isSelected = opt.value === value;
                                const isHi = i === activeIndex;
                                return (
                                    <li key={opt.value} role="presentation">
                                        <button
                                            type="button"
                                            role="option"
                                            aria-selected={isSelected}
                                            ref={(el) => {
                                                itemRefs.current[i] = el;
                                            }}
                                            className={cn(
                                                "relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none",
                                                isHi && "bg-accent text-accent-foreground",
                                                !isHi && "hover:bg-muted/80",
                                            )}
                                            onClick={() => selectIndex(i)}
                                            onMouseEnter={() => setHighlighted(i)}
                                        >
                                            <Check className={cn("mr-2 h-4 w-4 shrink-0", isSelected ? "opacity-100" : "opacity-0")} aria-hidden />
                                            <span className="truncate text-left">{opt.label}</span>
                                        </button>
                                    </li>
                                );
                            })
                        )}
                    </ul>
                </ScrollArea>
            </PopoverContent>
        </Popover>
    );
}
