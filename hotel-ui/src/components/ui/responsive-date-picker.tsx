import * as React from "react"
import { Calendar } from "./calendar"
import { Popover, PopoverContent, PopoverTrigger } from "./popover"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./dialog"
import { format, parse, isValid } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "./button"
import { Input } from "./input"
import {
    APP_DATE_DISPLAY_FORMAT,
    APP_DATE_INPUT_PLACEHOLDER,
    APP_DATE_TIME_INPUT_PLACEHOLDER,
} from "@/utils/dateFormat"

interface ResponsiveDatePickerProps {
    value: Date | null | undefined
    onChange: (date: Date | null) => void
    placeholder?: string
    label?: string
    disabled?: boolean
    minDate?: Date
    className?: string
    showTime?: boolean
    displayFormat?: string
}

export function ResponsiveDatePicker({
    value,
    onChange,
    placeholder,
    label = "Date",
    disabled,
    minDate,
    className,
    showTime,
    displayFormat = APP_DATE_DISPLAY_FORMAT
}: ResponsiveDatePickerProps) {
    const [open, setOpen] = React.useState(false)
    const [isMobile, setIsMobile] = React.useState(false)
    const inputPlaceholder = placeholder ?? (showTime ? APP_DATE_TIME_INPUT_PLACEHOLDER : APP_DATE_INPUT_PLACEHOLDER)

    // Local state for manual typing
    const [typedValue, setTypedValue] = React.useState(
        value && !isNaN(value.getTime()) 
            ? format(value, showTime ? `${displayFormat} HH:mm` : displayFormat) 
            : ""
    )

    React.useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 640)
        checkMobile()
        window.addEventListener("resize", checkMobile)
        return () => window.removeEventListener("resize", checkMobile)
    }, [])

    // Sync local state when external value changes
    React.useEffect(() => {
        setTypedValue(
            value && !isNaN(value.getTime()) 
                ? format(value, showTime ? `${displayFormat} HH:mm` : displayFormat) 
                : ""
        )
    }, [value, showTime, displayFormat])

    const handleInputChange = (val: string) => {
        setTypedValue(val)
        const formatStr = showTime ? `${displayFormat} HH:mm` : displayFormat
        if (val.length === formatStr.length) {
            const parsed = parse(val, formatStr, new Date())
            if (isValid(parsed)) {
                onChange(parsed)
            }
        } else if (val === "") {
            onChange(null)
        }
    }

    const handleBlur = () => {
        // Revert to current actual date if invalid text is left
        setTypedValue(
            value && !isNaN(value.getTime()) 
                ? format(value, showTime ? `${displayFormat} HH:mm` : displayFormat) 
                : ""
        )
    }

    const Trigger = (
        <div className={cn(
            "flex h-10 w-full items-center rounded-md border border-input bg-background overflow-hidden focus-within:ring-1 focus-within:ring-ring transition-all group shadow-sm",
            disabled && "opacity-50 cursor-not-allowed pointer-events-none",
            className
        )}>
            <Input
                className="border-0 focus-visible:ring-0 h-full text-sm font-medium placeholder:text-muted-foreground/60 shadow-none px-3"
                value={typedValue}
                placeholder={inputPlaceholder}
                onChange={(e) => handleInputChange(e.target.value)}
                onBlur={handleBlur}
                onClick={() => setOpen(true)}
                disabled={disabled}
            />
            <CalendarIcon 
                className="h-4 w-4 mr-3 text-muted-foreground/50 group-hover:text-primary transition-colors cursor-pointer" 
                onClick={() => setOpen(true)}
            />
        </div>
    )

    const handleTimeChange = (timeStr: string) => {
        if (!value) return
        const [hours, minutes] = timeStr.split(":").map(Number)
        const newDate = new Date(value)
        newDate.setHours(hours)
        newDate.setMinutes(minutes)
        onChange(newDate)
    }

    const CalendarContent = (
        <div className="flex flex-col bg-background">
            <Calendar
                mode="single"
                selected={value || undefined}
                onSelect={(date) => {
                    if (date) {
                        const newDate = new Date(date)
                        if (value) {
                            newDate.setHours(value.getHours())
                            newDate.setMinutes(value.getMinutes())
                        }
                        onChange(newDate)
                    } else {
                        onChange(null)
                    }
                    if (!showTime) setOpen(false)
                }}
                disabled={(date) => (minDate ? date < minDate : false)}
                initialFocus
                className="bg-background"
            />
            {showTime && value && (
                <div className="p-3 border-t bg-muted/20 flex items-center justify-between gap-4">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Time</span>
                    <input
                        type="time"
                        className="bg-transparent border-none focus:ring-0 text-sm font-semibold"
                        value={format(value, "HH:mm")}
                        onChange={(e) => handleTimeChange(e.target.value)}
                    />
                </div>
            )}
            {showTime && (
                <div className="p-2 border-t bg-muted/10 flex justify-end">
                    <Button 
                        size="sm" 
                        onClick={() => setOpen(false)}
                        className="text-xs h-7 px-4"
                    >
                        Done
                    </Button>
                </div>
            )}
        </div>
    )

    if (isMobile) {
        return (
            <>
                {Trigger}
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogContent className="max-w-[340px] p-0 overflow-hidden rounded-xl border-none shadow-2xl bg-background">
                        <DialogHeader className="p-4 border-b bg-muted/30 text-left">
                            <DialogTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                                {label}
                            </DialogTitle>
                        </DialogHeader>
                        <div className="flex justify-center p-2 bg-background">
                            {CalendarContent}
                        </div>
                    </DialogContent>
                </Dialog>
            </>
        )
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>{Trigger}</PopoverTrigger>
            <PopoverContent className="w-auto p-0 z-[100] border-border bg-background shadow-xl" align="start">
                {CalendarContent}
            </PopoverContent>
        </Popover>
    )
}
