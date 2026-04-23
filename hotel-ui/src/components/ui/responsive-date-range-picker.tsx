import * as React from "react"
import { Calendar } from "./calendar"
import { Popover, PopoverContent, PopoverTrigger } from "./popover"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./dialog"
import { format, parse, isValid } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "./input"

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
}

export function ResponsiveDateRangePicker({
    startDate,
    endDate,
    onChange,
    startPlaceholder = "dd-mm-yyyy",
    endPlaceholder = "dd-mm-yyyy",
    startLabel = "From",
    endLabel = "To",
    disabled,
    minDate,
    className
}: ResponsiveDateRangePickerProps) {
    const [open, setOpen] = React.useState(false)
    const [isMobile, setIsMobile] = React.useState(false)

    // Local state for manual typing
    const [typedStart, setTypedStart] = React.useState(
        startDate && !isNaN(startDate.getTime()) ? format(startDate, "dd-MM-yyyy") : ""
    )
    const [typedEnd, setTypedEnd] = React.useState(
        endDate && !isNaN(endDate.getTime()) ? format(endDate, "dd-MM-yyyy") : ""
    )

    React.useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768)
        checkMobile()
        window.addEventListener("resize", checkMobile)
        return () => window.removeEventListener("resize", checkMobile)
    }, [])

    // Sync local state when external value changes
    React.useEffect(() => {
        setTypedStart(startDate && !isNaN(startDate.getTime()) ? format(startDate, "dd-MM-yyyy") : "")
    }, [startDate])

    React.useEffect(() => {
        setTypedEnd(endDate && !isNaN(endDate.getTime()) ? format(endDate, "dd-MM-yyyy") : "")
    }, [endDate])

    const handleStartChange = (val: string) => {
        setTypedStart(val)
        if (val.length === 10) {
            const parsed = parse(val, "dd-MM-yyyy", new Date())
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
        if (val.length === 10) {
            const parsed = parse(val, "dd-MM-yyyy", new Date())
            if (isValid(parsed)) {
                onChange([startDate || null, parsed])
            }
        } else if (val === "") {
            onChange([startDate || null, null])
        }
    }

    const handleBlur = () => {
        // Revert to current actual dates if invalid text is left
        setTypedStart(startDate && !isNaN(startDate.getTime()) ? format(startDate, "dd-MM-yyyy") : "")
        setTypedEnd(endDate && !isNaN(endDate.getTime()) ? format(endDate, "dd-MM-yyyy") : "")
    }

    const Trigger = (
        <div
            className={cn(
                "grid grid-cols-1 gap-2 md:grid-cols-2",
                disabled && "opacity-50 cursor-not-allowed pointer-events-none",
                className
            )}
        >
            {/* Start Date Input */}
            <div className="flex h-10 w-full items-center rounded-lg border border-input bg-background overflow-hidden focus-within:ring-1 focus-within:ring-ring transition-all group shadow-sm">
                {startLabel && (
                    <span className="px-3 bg-muted/40 text-muted-foreground text-[10px] font-bold uppercase tracking-wider whitespace-nowrap flex items-center border-r border-border h-full min-w-[60px] justify-center">
                        {startLabel}
                    </span>
                )}
                <Input
                    className="border-0 focus-visible:ring-0 h-full text-xs font-medium placeholder:text-muted-foreground/60 shadow-none"
                    value={typedStart}
                    placeholder={startPlaceholder}
                    onChange={(e) => handleStartChange(e.target.value)}
                    onBlur={handleBlur}
                    onClick={() => setOpen(true)}
                    disabled={disabled}
                />
                <CalendarIcon 
                    className="h-4 w-4 mr-3 text-muted-foreground/50 group-hover:text-primary transition-colors cursor-pointer" 
                    onClick={() => setOpen(true)}
                />
            </div>

            {/* End Date Input */}
            <div className="flex h-10 w-full items-center rounded-lg border border-input bg-background overflow-hidden focus-within:ring-1 focus-within:ring-ring transition-all group shadow-sm">
                {endLabel && (
                    <span className="px-3 bg-muted/40 text-muted-foreground text-[10px] font-bold uppercase tracking-wider whitespace-nowrap flex items-center border-r border-border h-full min-w-[60px] justify-center">
                        {endLabel}
                    </span>
                )}
                <Input
                    className="border-0 focus-visible:ring-0 h-full text-xs font-medium placeholder:text-muted-foreground/60 shadow-none"
                    value={typedEnd}
                    placeholder={endPlaceholder}
                    onChange={(e) => handleEndChange(e.target.value)}
                    onBlur={handleBlur}
                    onClick={() => setOpen(true)}
                    disabled={disabled}
                />
                <CalendarIcon 
                    className="h-4 w-4 mr-3 text-muted-foreground/50 group-hover:text-primary transition-colors cursor-pointer" 
                    onClick={() => setOpen(true)}
                />
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
                            <DialogTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
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
