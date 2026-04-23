import React, { useMemo, useState } from "react"
import { NativeSelect } from "@/components/ui/native-select";
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
    forceNative?: boolean
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
    forceNative = false
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
            // Keep the item if it's not disabled OR if it's the currently selected value for this specific field
            return !isDisabled || (value && String(value) === itemId);
        });
    }, [normalizedItems, normalizedDisabledIds, value]);

    const isSearchable = filteredItems.length > 5;

    const selectedItem = useMemo(() => {
        if (!value) return null;
        return normalizedItems.find(item => String(item.id) === String(value) || String(item.label) === String(value));
    }, [normalizedItems, value]);

    const getLabel = (item: any) => String(item[itemName] ?? item.label ?? item.id);

    if (!forceNative && isSearchable && !disabled) {
        return (
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className={cn(
                            "flex h-9 w-full items-center justify-between rounded-[3px] border border-input bg-background px-2 py-1 text-sm font-normal shadow-none hover:bg-background text-left transition-colors duration-150",
                            !value && "text-muted-foreground",
                            extraClasses
                        )}
                    >
                        <span className="truncate flex-1">
                            {selectedItem ? getLabel(selectedItem) : placeholder}
                        </span>
                        <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent 
                    className="p-0 w-[var(--radix-popover-trigger-width)] shadow-2xl border-border bg-background" 
                    align="start"
                    side="bottom"
                    sideOffset={4}
                >
                    <Command className="border-none shadow-none bg-background">
                        <CommandInput placeholder={`Search ${placeholder.toLowerCase()}...`} className="h-9" />
                        <CommandList 
                            className="max-h-[250px] overflow-y-auto bg-background"
                            onWheel={(e) => e.stopPropagation()}
                        >
                            <CommandEmpty className="py-4 text-xs italic text-muted-foreground">No results found.</CommandEmpty>
                            <CommandGroup>
                                {filteredItems.map((item) => {
                                    const itemId = item.id?.toString() || item.label?.toString() || "";
                                    const itemLabel = getLabel(item);
                                    return (
                                        <CommandItem
                                            key={itemId}
                                            value={itemLabel} // searching by label
                                            onSelect={() => {
                                                onSelect(Number(itemId) || itemId);
                                                setOpen(false);
                                            }}
                                            className={cn(
                                                "flex items-center justify-between cursor-pointer py-1.5 px-2 text-sm rounded-sm transition-colors",
                                                String(value) === itemId ? "bg-primary text-primary-foreground hover:bg-primary/90" : "hover:bg-accent hover:text-accent-foreground"
                                            )}
                                        >
                                            <span className="truncate">{itemLabel}</span>
                                            <Check
                                                className={cn(
                                                    "ml-auto h-3.5 w-3.5",
                                                    String(value) === itemId ? "text-primary-foreground opacity-100" : "opacity-0"
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

    return (
        <NativeSelect
            value={value ?? ""}
            onChange={(e) => {
                if (e.target.value) {
                    onSelect(Number(e.target.value) || e.target.value)
                }
            }}
            disabled={disabled}
            className={cn(
                "flex h-9 w-full rounded-[3px] border border-input bg-background px-3 text-base ring-offset-background transition-colors duration-150 md:text-sm",
                extraClasses
            )}
            placeholder={placeholder}
        >
            {filteredItems.map((item) => {
                const itemId = item.id?.toString() || item.label?.toString() || "";
                const itemLabel = getLabel(item);
                return (
                    <option key={itemId} value={itemId}>
                        {itemLabel}
                    </option>
                );
            })}
        </NativeSelect>
    )
}

