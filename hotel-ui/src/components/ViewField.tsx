import { cn } from "@/lib/utils";

type Props = {
    label: string;
    value: React.ReactNode;
    className?: string;
    labelClassName?: string;
    valueClassName?: string;
    hideIfEmpty?: boolean;
};

export default function ViewField({ label, value, className, labelClassName, valueClassName, hideIfEmpty }: Props) {
    if (hideIfEmpty && !value) return null;

    return (
        <div className={cn("min-w-0 space-y-1", className)}>
            <div className={cn("text-xs font-bold text-muted-foreground/80", labelClassName)}>
                {label}
            </div>
            <div className={cn("text-sm font-semibold leading-snug text-foreground break-words cursor-default select-text", valueClassName)}>
                {value || "-"}
            </div>
        </div>
    );
}
