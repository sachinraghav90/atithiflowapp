import * as React from "react"
import { ResponsiveDateRangePicker } from "../ui/responsive-date-range-picker"
import { Label } from "../ui/label"
import { APP_DATE_INPUT_PLACEHOLDER } from "@/utils/dateFormat"
import { cn } from "@/lib/utils"

type FieldError = {
    type?: "required" | "invalid"
    message?: string
}

type Props = {
    startLabel: string
    endLabel: string
    startField: string
    endField: string
    startDate: Date | null
    endDate: Date | null
    onChange: (dates: [Date | null, Date | null]) => void
    errors?: Record<string, FieldError>
    setErrors: (fn: (prev: Record<string, FieldError>) => Record<string, FieldError>) => void
    required?: boolean
    className?: string
    minDate?: Date
}

export default function FormDateRangePicker({
    startLabel,
    endLabel,
    startField,
    endField,
    startDate,
    endDate,
    onChange,
    errors,
    setErrors,
    required,
    className,
    minDate,
}: Props) {
    const startError = errors?.[startField]
    const endError = errors?.[endField]

    return (
        <div className={cn("space-y-4", className)}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                 <div className="space-y-2">
                    <Label title={startError?.type === "required" ? startError.message : ""} className="text-foreground">
                        {startLabel} {required && "*"}
                    </Label>
                    {startError?.type === "invalid" && (
                        <p className="text-xs text-red-500 animate-in fade-in slide-in-from-top-1">{startError.message}</p>
                    )}
                </div>
                <div className="space-y-2">
                    <Label title={endError?.type === "required" ? endError.message : ""} className="text-foreground">
                        {endLabel} {required && "*"}
                    </Label>
                    {endError?.type === "invalid" && (
                        <p className="text-xs text-red-500 animate-in fade-in slide-in-from-top-1">{endError.message}</p>
                    )}
                </div>
            </div>

            <ResponsiveDateRangePicker
                startDate={startDate}
                endDate={endDate}
                onChange={(dates) => {
                    onChange(dates)
                    setErrors((prev) => {
                        const next = { ...prev }
                        delete next[startField]
                        delete next[endField]
                        return next
                    })
                }}
                minDate={minDate}
                startPlaceholder={APP_DATE_INPUT_PLACEHOLDER}
                endPlaceholder={APP_DATE_INPUT_PLACEHOLDER}
                className={cn((startError || endError) && "border-red-500")}
            />
        </div>
    )
}
