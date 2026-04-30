import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { normalizeTextInput } from "@/utils/normalizeTextInput";

type FieldError = {
    type?: "required" | "invalid";
    message?: string;
};

type Props = {
    label: string;
    field: string;
    value: any;

    setValue: (fn: (prev: any) => any) => void;

    errors?: Record<string, FieldError>;
    setErrors?: (fn: (prev: any) => any) => void;

    viewMode?: boolean;
    required?: boolean;

    placeholder?: string;
    type?: string;

    transform?: (val: string) => any;
    onChangeExtra?: (val: string) => void;

    maxLength?: number;
};

export default function FormInput({
    label,
    field,
    value,
    setValue,
    errors = {},
    setErrors,
    viewMode = false,
    required = false,
    placeholder,
    type = "text",
    onChangeExtra,
    transform,
    maxLength
}: Props) {

    const error = errors[field];

    const hoverError =
        error?.type === "required" ? error.message : "";

    return (
        <div className="space-y-1">

            <Label className="text-xs font-medium text-muted-foreground">
                {label} {required && "*"}
            </Label>

            <Input
                disabled={viewMode}
                type={type}
                value={value[field] || ""}
                placeholder={placeholder}
                title={hoverError}
                maxLength={maxLength}
                className={
                    error
                        ? "border-red-500"
                        : ""
                }
                onChange={(e) => {

                    let newValue = e.target.value;

                    // ⭐ Apply transform if provided
                    if (transform) {
                        newValue = transform(newValue);
                    } else {
                        newValue = normalizeTextInput(newValue);
                        console.log("🚀 ~ FormInput ~ newValue:", newValue, field)
                    }

                    setValue((prev: any) => ({
                        ...prev,
                        [field]: newValue,
                    }));

                    // ⭐ Clear existing error
                    setErrors((prev: any) => {
                        const next = { ...prev };
                        delete next[field];
                        return next;
                    });

                    // ⭐ Extra logic (validation etc)
                    onChangeExtra?.(newValue);
                }}

            />

            {/* inline invalid error */}
            {error?.type === "invalid" && (
                <p className="text-xs text-red-500">
                    {error.message}
                </p>
            )}

        </div>
    );
}
