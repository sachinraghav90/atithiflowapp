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
    viewMode
}: any) {

    const error = errors?.[field];

    const hoverError =
        error?.type === "required" ? error.message : "";

    return (
        <div
            className="space-y-2"
            title={hoverError}   // ⭐ apply tooltip here (reliable)
        >

            <Label>
                {label} {required && "*"}
            </Label>

            <NativeSelect
                disabled={viewMode}
                className={`
                    w-full h-10 rounded-[3px] px-3 text-sm bg-background
                    ${error
                        ? "border border-red-500"
                        : "border border-border"
                    }
                `}
                value={value[field] ?? ""}
                onChange={(e) => {

                    setValue((prev: any) => ({
                        ...prev,
                        [field]: e.target.value
                    }));

                    setErrors((prev: any) => {
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

