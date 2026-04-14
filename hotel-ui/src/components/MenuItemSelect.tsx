import React, { useMemo } from "react"
import { NativeSelect } from "@/components/ui/native-select";
import { cn } from "@/lib/utils";

type Item = {
  id: number | string;
  label: string;
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
};

export function MenuItemSelect({
    value,
    items,
    disabledIds,
    onSelect,
    itemName = "item_name",
    disabled = false,
    extraClasses = "",
    placeholder = "Select option"

}: Props) {
    const normalizedItems = useMemo(() => {
        if (Array.isArray(items)) return items;
        if (Array.isArray(items?.data)) return items.data;
        return [];
    }, [items]);

    const normalizedDisabledIds = disabledIds ?? [];

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
  "flex h-10 w-full rounded-md border border-input bg-background px-3 text-base ring-offset-background",
  "placeholder:text-muted-foreground text-foreground",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
  "disabled:cursor-not-allowed disabled:opacity-50",
  "transition-colors duration-150 md:text-sm",
  extraClasses
)}

        >
            <option value="" disabled>
                {placeholder}
            </option>
            {normalizedItems.map((item) => {
                const itemId = item.id?.toString() || item.label?.toString()
                const itemLabel = String(item[itemName] ?? item.label ?? itemId)
                const isDisabled = normalizedDisabledIds.some((disabledId) => String(disabledId) === itemId)

                return (
                    <option
                        key={itemId}
                        value={itemId}
                        disabled={isDisabled}
                        className={isDisabled ? "opacity-50" : ""}
                    >
                        {itemLabel}
                    </option>
                )
            })}
        </NativeSelect>
    )
}

