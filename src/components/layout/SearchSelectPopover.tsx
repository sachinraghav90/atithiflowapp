import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Command,
    CommandGroup,
    CommandInput,
    CommandItem,
} from "@/components/ui/command";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

type Item<T> = {
    label: string;   // what user sees
    value: T;        // actual value
};

type Props<T> = {
    value?: T;
    placeholder?: string;
    items: Item<T>[];
    onSelect: (value: T) => void;
    className?: string;
};


export default function SearchSelectPopover<T>({
    value,
    placeholder = "Select",
    items,
    onSelect,
    className,
}: Props<T>) {

    const [open, setOpen] = useState(false);

    const selected = items.find(i => i.value === value);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    className={cn(
                        "w-full h-10 justify-between bg-background",
                        className
                    )}
                >
                    {selected?.label || placeholder}
                    <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
            </PopoverTrigger>

            <PopoverContent
                className="w-[--radix-popover-trigger-width] p-0 overflow-hidden bg-background border border-border shadow-md"
            >
                <Command className="bg-background">
                    <CommandInput placeholder="Search..." />

                    <CommandGroup
                        className="max-h-60 overflow-y-auto"
                        onWheel={(e) => e.stopPropagation()}
                    >

                        {items.map((item) => {
                            const isSelected = item.value === value;
                            return (
                                <CommandItem
                                    key={String(item.value)}
                                    value={item.label}
                                    onSelect={() => {
                                        onSelect(item.value);
                                        setOpen(false);
                                    }}
                                    className={cn(
                                        "cursor-pointer transition-colors",
                                        isSelected && "bg-primary text-primary-foreground font-semibold"
                                    )}
                                >
                                    <Check className={cn("mr-2 h-4 w-4", isSelected ? "opacity-100" : "opacity-0")} />
                                    {item.label}
                                </CommandItem>
                            );
                        })}
                    </CommandGroup>
                </Command>
            </PopoverContent>

        </Popover>
    );
}
