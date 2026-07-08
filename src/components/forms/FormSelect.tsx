import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";

export default function FormSelect({
    label,
    field,
    value,
    setValue,
    errors,
    setErrors,
    required,
    children,
    viewMode,
    className,
    hideIcon,
    isVertical
}: any) {

    const error = errors?.[field];

    const hoverError =
        error?.type === "required" ? error.message : "";

    return (
        <div
            className="space-y-1"
            title={hoverError}   // ⭐ apply tooltip here (reliable)
        >

            {label && (
                <Label>
                    {label} {required && "*"}
                </Label>
            )}

            <NativeSelect
                disabled={viewMode}
                hideIcon={hideIcon}
                isVertical={isVertical}
                className={`
                    w-full h-11 rounded-[3px] px-3 text-sm bg-background shadow-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0
                    ${className}
                    ${error
                        ? "border border-red-500"
                        : "border border-border/70"
                    }
                `}
                value={value[field] ?? ""}
                onChange={(e) => {

                    setValue((prev: any) => ({
                        ...prev,
                        [field]: e.target.value
                    }));

                    setErrors?.((prev: any) => {
                        const next = { ...prev };
                        delete next[field];
                        return next;
                    });
                }}
            >
                {children}
            </NativeSelect>

            {/* inline invalid error */}
            {error?.type === "invalid" && (
                <p className="text-xs text-red-500">
                    {error.message}
                </p>
            )}

        </div>
    );
}

