import React from "react";
import { Label } from "@/components/ui/label";
import { MenuItemMultiSelect } from "@/components/MenuItemMultiSelect";

export default function FormMultiSelect({
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

    const options = React.useMemo(() => {
        return React.Children.toArray(children)
          .map((child) => {
            if (React.isValidElement(child) && child.type === "option") {
              // Ignore disabled placeholder options
              if (child.props.disabled) return null;
              return {
                id: child.props.value,
                label: child.props.children?.toString() || String(child.props.value),
              };
            }
            return null;
          })
          .filter((opt): opt is { id: string | number; label: string } => opt !== null);
    }, [children]);

    // Strip common legacy styling classes that would cause "double-bordering" or misalignment
    const cleanedClassName = className
        ?.replace(/\bborder\b/g, "")
        ?.replace(/\bborder-border\b/g, "")
        ?.replace(/\bborder-input\b/g, "")
        ?.replace(/\bpx-\d+\b/g, "")
        ?.replace(/\bbg-\w+\b/g, "")
        ?.replace(/\brounded-\w+\b/g, "")
        ?.replace(/\bh-\d+\b/g, "")
        ?.trim() || "";

    const combinedClasses = `w-full ${cleanedClassName} ${error ? "border border-red-500" : "border border-border/70"}`;

    return (
        <div
            className="space-y-1"
            title={hoverError}
        >

            {label && (
                <Label>
                    {label} {required && "*"}
                </Label>
            )}

            <MenuItemMultiSelect
                value={value[field] || []}
                items={options}
                onSelect={(selectedIds) => {
                    setValue((prev: any) => ({
                        ...prev,
                        [field]: selectedIds
                    }));

                    setErrors?.((prev: any) => {
                        const next = { ...prev };
                        delete next[field];
                        return next;
                    });
                }}
                disabled={viewMode}
                hideIcon={hideIcon}
                isVertical={isVertical}
                extraClasses={combinedClasses}
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
