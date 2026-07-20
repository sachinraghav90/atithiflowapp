import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import COUNTRY_CODES from "@/utils/countryCode.json";

type PhonePrefixSelectProps = {
    value: string;
    onValueChange: (value: string) => void;
    triggerClassName?: string;
    contentClassName?: string;
    inputClassName?: string;
    itemClassName?: string;
    iconClassName?: string;
    disabled?: boolean;
    hideIcon?: boolean;
    error?: boolean;
};

export default function PhonePrefixSelect({
    value,
    onValueChange,
    triggerClassName,
    contentClassName,
    inputClassName,
    itemClassName,
    iconClassName,
    disabled = false,
    hideIcon = false,
    error = false,
}: PhonePrefixSelectProps) {
    const [open, setOpen] = useState(false);

    return (
        <Popover open={open} onOpenChange={(nextOpen) => !disabled && setOpen(nextOpen)}>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    disabled={disabled}
                    className={cn(
                        "flex items-center justify-center gap-1 w-[60px] h-11 bg-background text-foreground rounded-l-[3px] rounded-r-none border-border/70 px-1",
                        hideIcon ? "px-0" : "px-1",
                        error && "border-red-500",
                        triggerClassName
                    )}
                >
                    <span className="text-sm font-semibold text-muted-foreground">{value}</span>
                    {!hideIcon && <ChevronDown className={cn("h-4 w-4 shrink-0 opacity-50", iconClassName)} />}
                </Button>
            </PopoverTrigger>

            <PopoverContent
                className={cn(
                    "w-fit min-w-0 max-w-[100px] overflow-hidden border border-border bg-background p-0 text-foreground shadow-lg",
                    contentClassName
                )}
            >
                <Command className="bg-background text-foreground [&_[cmdk-input-wrapper]]:bg-background/50 [&_[cmdk-input-wrapper]]:border-b [&_[cmdk-input-wrapper]]:border-border/50 [&_[cmdk-input]]:text-sm [&_[cmdk-input]]:text-foreground [&_[cmdk-input]]:placeholder:text-muted-foreground/60 w-fit [&_[cmdk-input-wrapper]]:w-fit [&_[cmdk-input-wrapper]_svg]:hidden [&_[cmdk-input-wrapper]]:px-1 [&_[cmdk-list]]:w-fit [&_[cmdk-group]]:w-fit [&_[cmdk-item]]:w-fit [&_[cmdk-input]]:w-fit [&_[cmdk-input]]:min-w-0 [&_[cmdk-input]]:max-w-[90px]">
                    <CommandInput
                        placeholder="Search"
                        className={cn("bg-transparent h-9", inputClassName)}
                    />
                    <CommandEmpty className="py-6 text-center text-xs text-muted-foreground italic">
                        No country found
                    </CommandEmpty>
 
                    <CommandGroup
                        className="max-h-60 overflow-y-auto bg-background p-1 app-scrollbar"
                        onWheel={(e) => e.stopPropagation()}
                    >
                        {COUNTRY_CODES.map((country) => {
                            const isSelected = value === country.country_code;
 
                            return (
                                <CommandItem
                                    key={`${country.country_name_code}-${country.country_code}`}
                                    value={`${country.country_name_code} ${country.country_code}`}
                                    onSelect={() => {
                                        onValueChange(country.country_code);
                                        setOpen(false);
                                    }}
                                    className={cn(
                                        "cursor-pointer rounded-[3px] px-0.5 py-1.5 text-[13px] font-medium text-foreground/80 transition-all mb-0.5",
                                        "hover:bg-primary/10 hover:text-primary",
                                        isSelected && "bg-primary/10 text-primary font-bold",
                                        itemClassName
                                    )}
                                >
                                    {country.country_name_code} ({country.country_code})
                                </CommandItem>
                            );
                        })}
                    </CommandGroup>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
