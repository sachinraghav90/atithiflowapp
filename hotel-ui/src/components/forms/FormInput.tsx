import type { ReactNode } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { normalizeTextInput } from "@/utils/normalizeTextInput";

type FieldError = {
    type?: "required" | "invalid";
    message?: string;
};

type Props = {
    label: string;
    field: string;
    value: Record<string, any>;

    setValue: (fn: (prev: Record<string, any>) => Record<string, any>) => void;

    errors?: Record<string, FieldError | undefined>;
    setErrors?: (fn: (prev: Record<string, any>) => Record<string, any>) => void;

    viewMode?: boolean;
    required?: boolean;

    placeholder?: string;
    type?: string;
    autoComplete?: string;

    transform?: (val: string) => any;
    onChangeExtra?: (val: string) => void;

    maxLength?: number;
    prefix?: string;
    prefixControl?: ReactNode;
    className?: string;
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
    autoComplete,
    onChangeExtra,
    transform,
    maxLength,
    prefix,
    prefixControl,
    className
}: Props) {

    const error = errors[field];
    const hasPrefix = Boolean(prefix || prefixControl);

    const hoverError =
        error?.type === "required" ? error.message : "";

    return (
        <div className="space-y-1">

            {label && (
                <Label className="text-foreground">
                    {label} {required && "*"}
                </Label>
            )}

            <div className="flex gap-0">
                {prefixControl || (prefix && (
                    <span
                        className={cn(
                            "inline-flex h-11 shrink-0 items-center rounded-l-[3px] border border-r-0 border-border/70 bg-muted/40 px-3 text-sm font-semibold text-muted-foreground",
                            error && "border-red-500"
                        )}
                    >
                        {prefix}
                    </span>
                ))}

                <Input
                    disabled={viewMode}
                    type={type}
                    autoComplete={autoComplete ?? (type === "password" ? "new-password" : "off")}
                    value={value[field] ?? ""}
                    placeholder={placeholder}
                    title={hoverError}
                    maxLength={maxLength}
                    className={cn(
                        "h-11 rounded-[3px] border-border/70 bg-background text-sm shadow-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0",
                        hasPrefix && "rounded-l-none border-l-0",
                        className,
                        error && "border-red-500"
                    )}
                    onChange={(e) => {
                        let newValue = e.target.value;

                        if (transform) {
                            newValue = transform(newValue);
                        } else {
                            newValue = normalizeTextInput(newValue);
                        }

                        setValue((prev) => ({
                            ...prev,
                            [field]: newValue,
                        }));

                        setErrors?.((prev) => {
                            const next = { ...prev };
                            delete next[field];
                            return next;
                        });

                        onChangeExtra?.(newValue);
                    }}
                />
            </div>

            {error?.type === "invalid" && (
                <p className="text-xs text-red-500">
                    {error.message}
                </p>
            )}

        </div>
    );
}
