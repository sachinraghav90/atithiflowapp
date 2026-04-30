type Props = {
    label: string;
    value: string | number | null | undefined;
    className?: string;
};

export default function ViewField({ label, value, className }: Props) {
    return (
        <div className={`min-w-0 space-y-1 ${className || ""}`}>
            <div className="text-[10px] font-bold tracking-wide text-muted-foreground/80">
                {label}
            </div>
            <div className="text-sm font-semibold leading-snug text-foreground break-words cursor-default select-text">
                {value || "-"}
            </div>
        </div>
    );
}
