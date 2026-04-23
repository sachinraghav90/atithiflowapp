import * as React from "react"
import { ResponsiveDatePicker } from "../ui/responsive-date-picker"
import { Label } from "../ui/label"
import { cn } from "@/lib/utils"

export default function FormDatePicker({
    label,
    field,
    value,
    setValue,
    errors,
    setErrors,
    required,
    selected,
    onChange,
}: any) {
    const error = errors?.[field]
    const hoverError = error?.type === "required" ? error.message : ""

    return (
        <div className="space-y-2">
            <Label title={hoverError} className="text-sm font-semibold">
                {label} {required && "*"}
            </Label>
            <ResponsiveDatePicker
                value={selected}
                onChange={(date) => {
                    onChange(date)
                    setErrors((prev: any) => {
                        const next = { ...prev }
                        delete next[field]
                        return next
                    })
                }}
                placeholder="DD/MM/YYYY"
                label={label}
                className={cn(error && "border-red-500 focus:ring-red-500")}
            />
            {error?.type === "invalid" && (
                <p className="text-xs text-red-500 animate-in fade-in slide-in-from-top-1">
                    {error.message}
                </p>
            )}
        </div>
    )
}
