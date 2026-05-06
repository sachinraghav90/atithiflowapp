import React, { useMemo, useState } from "react"
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, ChevronDown } from "lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

type Item = {
  id: number | string;
  label?: string;
  [key: string]: unknown;
};

type Props = {
    value?: number | string
    items: Item[] | { data?: Item[] } | null | undefined
    onSelect: (id: number | string) => void
    disabled?: boolean
    disabledIds?: (number | string)[]
    extraClasses?: string
    itemName?: string
    placeholder?: string
    hideIcon?: boolean
};

export function MenuItemSelect({
    value,
    items,
    disabledIds,
    onSelect,
    itemName = "item_name",
    disabled = false,
    extraClasses = "",
    placeholder = "--Please Select--",
    hideIcon = false,
}: Props) {
    const [open, setOpen] = useState(false);

    const normalizedItems = useMemo(() => {
        if (Array.isArray(items)) return items;
        if (Array.isArray(items?.data)) return items.data;
        return [];
    }, [items]);

    const normalizedDisabledIds = disabledIds ?? [];

    const filteredItems = useMemo(() => {
        return normalizedItems.filter((item) => {
            const itemId = item.id?.toString() || item.label?.toString();
            const isDisabled = normalizedDisabledIds.some((disabledId) => String(disabledId) === itemId);
            return !isDisabled || (value !== undefined && value !== null && String(value) === itemId);
        });
    }, [normalizedItems, normalizedDisabledIds, value]);

    const isSearchable = filteredItems.length > 5;

    const selectedItem = useMemo(() => {
        if (value === undefined || value === null) return null;
        return normalizedItems.find(item => String(item.id) === String(value) || String(item.label) === String(value));
    }, [normalizedItems, value]);

    const getLabel = (item: any) => String(item[itemName] ?? item.label ?? item.id);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild disabled={disabled}>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    disabled={disabled}
                    className={cn(
                        "flex h-9 w-full items-center rounded-[3px] border border-input bg-background px-2 py-1 text-sm font-normal shadow-none hover:bg-background transition-colors duration-150",
                        hideIcon ? "justify-center text-center" : "justify-between text-left",
                        (value === "" || value === undefined || value === null) && "text-muted-foreground",
                        extraClasses
                    )}
                >
                    <span className={cn("truncate flex-1", hideIcon && "text-center")}>
                        {selectedItem ? getLabel(selectedItem) : placeholder}
                    </span>
                    {!hideIcon && <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />}
                </Button>
            </PopoverTrigger>
            <PopoverContent 
                className="p-0 w-[var(--radix-popover-trigger-width)] min-w-[100px] shadow-2xl border-border bg-background" 
                align="start"
                side="bottom"
                sideOffset={4}
            >
                <Command className="border-none shadow-none bg-background">
                    {isSearchable && (
                        <CommandInput 
                            placeholder={placeholder === "--Please Select--" ? "Search here..." : `Search ${placeholder.toLowerCase()}...`} 
                            className="h-9" 
                        />
                    )}
                    <CommandList 
                        className="max-h-[250px] overflow-y-auto bg-background app-scrollbar"
                        onWheel={(e) => e.stopPropagation()}
                    >
                        <CommandEmpty className="py-4 text-xs italic text-muted-foreground">No results found.</CommandEmpty>
                        <CommandGroup>
                            {filteredItems.map((item) => {
                                const itemId = (item.id !== undefined && item.id !== null) ? String(item.id) : (item.label?.toString() || "");
                                const itemLabel = getLabel(item);
                                return (
                                    <CommandItem
                                        key={itemId}
                                        value={itemLabel} 
                                        onSelect={() => {
                                            const finalValue = (itemId !== "" && !isNaN(Number(itemId))) ? Number(itemId) : itemId;
                                            onSelect(finalValue);
                                            setOpen(false);
                                        }}
                                        className={cn(
                                            "flex items-center justify-between cursor-pointer py-2 px-3 text-sm rounded-sm transition-all",
                                            String(value) === itemId ? "bg-primary/10 text-primary font-bold" : "hover:bg-primary/5 hover:text-primary"
                                        )}
                                    >
                                        <span className="truncate">{itemLabel}</span>
                                        <Check
                                            className={cn(
                                                "ml-auto h-4 w-4",
                                                String(value) === itemId ? "text-primary opacity-100" : "opacity-0"
                                            )}
                                        />
                                    </CommandItem>
                                );
                            })}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
