import * as React from "react"
import { Calendar } from "./calendar"
import { Popover, PopoverContent, PopoverTrigger } from "./popover"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./dialog"
import { format, parse, isValid } from "date-fns"
import { CalendarIcon, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "./input"
import {
    APP_DATE_DISPLAY_FORMAT,
    APP_DATE_INPUT_PLACEHOLDER,
} from "@/utils/dateFormat"

interface ResponsiveDateRangePickerProps {
    startDate: Date | null | undefined
    endDate: Date | null | undefined
    onChange: (dates: [Date | null, Date | null]) => void
    startPlaceholder?: string
    endPlaceholder?: string
    startLabel?: string
    endLabel?: string
    disabled?: boolean
    minDate?: Date
    className?: string
    displayFormat?: string
}

export function ResponsiveDateRangePicker({
    startDate,
    endDate,
    onChange,
    startPlaceholder = APP_DATE_INPUT_PLACEHOLDER,
    endPlaceholder = APP_DATE_INPUT_PLACEHOLDER,
    startLabel = "From",
    endLabel = "To",
    disabled,
    minDate,
    className,
    displayFormat = APP_DATE_DISPLAY_FORMAT
}: ResponsiveDateRangePickerProps) {
    const [open, setOpen] = React.useState(false)
    const [isMobile, setIsMobile] = React.useState(false)

    // Local state for manual typing
    const [typedStart, setTypedStart] = React.useState(
        startDate && !isNaN(startDate.getTime()) ? format(startDate, displayFormat) : ""
    )
    const [typedEnd, setTypedEnd] = React.useState(
        endDate && !isNaN(endDate.getTime()) ? format(endDate, displayFormat) : ""
    )

    React.useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768)
        checkMobile()
        window.addEventListener("resize", checkMobile)
        return () => window.removeEventListener("resize", checkMobile)
    }, [])

    // Sync local state when external value changes
    React.useEffect(() => {
        setTypedStart(startDate && !isNaN(startDate.getTime()) ? format(startDate, displayFormat) : "")
    }, [startDate, displayFormat])

    React.useEffect(() => {
        setTypedEnd(endDate && !isNaN(endDate.getTime()) ? format(endDate, displayFormat) : "")
    }, [endDate, displayFormat])

    const handleStartChange = (val: string) => {
        setTypedStart(val)
        if (val.length === displayFormat.length) {
            const parsed = parse(val, displayFormat, new Date())
            if (isValid(parsed)) {
                // If end date exists and new start is after end, we don't update yet or handle validation
                onChange([parsed, endDate || null])
            }
        } else if (val === "") {
            onChange([null, endDate || null])
        }
    }

    const handleEndChange = (val: string) => {
        setTypedEnd(val)
        if (val.length === displayFormat.length) {
            const parsed = parse(val, displayFormat, new Date())
            if (isValid(parsed)) {
                onChange([startDate || null, parsed])
            }
        } else if (val === "") {
            onChange([startDate || null, null])
        }
    }

    const handleBlur = () => {
        // Revert to current actual dates if invalid text is left
        setTypedStart(startDate && !isNaN(startDate.getTime()) ? format(startDate, displayFormat) : "")
        setTypedEnd(endDate && !isNaN(endDate.getTime()) ? format(endDate, displayFormat) : "")
    }

    React.useEffect(() => {
        setTypedStart(startDate && !isNaN(startDate.getTime()) ? format(startDate, displayFormat) : "")
        setTypedEnd(endDate && !isNaN(endDate.getTime()) ? format(endDate, displayFormat) : "")
    }, [startDate, endDate, displayFormat])

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange([null, null]);
    };

    const Trigger = (
        <div
            className={cn(
                "flex h-10 w-full items-center rounded-lg border border-input bg-background overflow-hidden focus-within:ring-1 focus-within:ring-ring transition-all group shadow-sm",
                disabled && "opacity-50 cursor-not-allowed pointer-events-none",
                className
            )}
        >
            {startLabel && (
                <div className="px-3 bg-muted/40 text-muted-foreground text-[11px] font-bold tracking-wide whitespace-nowrap flex items-center border-r border-border h-full min-w-[70px] justify-center select-none flex-shrink-0">
                    {startLabel}
                </div>
            )}

            {/* Date Inputs Area */}
            <div className="flex flex-1 items-center px-0 gap-0.5 h-full overflow-hidden justify-center">
                <Input
                    className="border-0 focus-visible:ring-0 h-full text-[10px] font-semibold placeholder:text-xs placeholder:text-muted-foreground/40 shadow-none px-0 w-[68px] text-center bg-transparent"
                    value={typedStart}
                    placeholder={startPlaceholder}
                    onChange={(e) => handleStartChange(e.target.value)}
                    onBlur={handleBlur}
                    onClick={() => setOpen(true)}
                    disabled={disabled}
                />
                
                <span className="text-muted-foreground/30 font-medium select-none mx-0 text-[10px]">
                    —
                </span>

                <Input
                    className="border-0 focus-visible:ring-0 h-full text-[10px] font-semibold placeholder:text-xs placeholder:text-muted-foreground/40 shadow-none px-0 w-[68px] text-center bg-transparent"
                    value={typedEnd}
                    placeholder={endPlaceholder}
                    onChange={(e) => handleEndChange(e.target.value)}
                    onBlur={handleBlur}
                    onClick={() => setOpen(true)}
                    disabled={disabled}
                />
            </div>

            {/* Icons Area */}
            <div className="flex items-center pr-3 flex-shrink-0">
                {(startDate || endDate) ? (
                    <XCircle 
                        className="h-3.5 w-3.5 text-muted-foreground/30 hover:text-destructive transition-colors cursor-pointer" 
                        onClick={handleClear}
                    />
                ) : (
                    <CalendarIcon 
                        className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-primary transition-colors cursor-pointer" 
                        onClick={() => setOpen(true)}
                    />
                )}
            </div>
        </div>
    )

    const CalendarContent = (
        <Calendar
            mode="range"
            selected={{
                from: startDate || undefined,
                to: endDate || undefined
            }}
            onSelect={(range) => {
                onChange([range?.from || null, range?.to || null])
                if (range?.from && range?.to) {
                    setTimeout(() => setOpen(false), 300)
                }
            }}
            disabled={(date) => (minDate ? date < minDate : false)}
            initialFocus
            numberOfMonths={isMobile ? 1 : 2}
            className="bg-background rounded-md"
        />
    )

    if (isMobile) {
        return (
            <>
                {Trigger}
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogContent className="max-w-[340px] p-0 overflow-hidden rounded-xl border-none shadow-2xl bg-background">
                        <DialogHeader className="p-4 border-b bg-muted/30 text-left">
                            <DialogTitle className="text-sm font-bold tracking-wider text-muted-foreground">
                                Select Range
                            </DialogTitle>
                        </DialogHeader>
                        <div className="flex justify-center p-2">
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
