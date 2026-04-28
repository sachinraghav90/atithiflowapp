import * as React from "react";
import { Search, Calendar as CalendarIcon, Download, FilterX, Pencil, Plus, RefreshCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { NativeSelect } from "@/components/ui/native-select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { normalizeTextInput } from "@/utils/normalizeTextInput";
import { formatReadableLabel } from "@/utils/formatString";
import { useId, type ReactNode } from "react";

function formatToolbarDate(date: Date | null) {
  if (!date) return "";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

/* ================= TYPES ================= */

type ToolbarOption = {
  label: string;
  value: string | number;
  disabled?: boolean;
};

type GridToolbarProps = {
  children: ReactNode;
  className?: string;
};

type GridToolbarRowProps = {
  children: ReactNode;
  className?: string;
};

type GridToolbarSearchProps = {
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
  placeholder?: string;
  className?: string;
};

type GridToolbarSelectProps = {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  options: ToolbarOption[];
  className?: string;
};

type GridToolbarAction = {
  key: string;
  label: string;
  icon: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  buttonClassName?: string;
};

type GridToolbarActionsProps = {
  actions: GridToolbarAction[];
  className?: string;
};

/* ================= ROOT ================= */

export function GridToolbar({ children, className }: GridToolbarProps) {
  return (
    <div
      className={cn(
        "w-full border-b border-border pt-1.5",
        className
      )}
    >
      {children}
    </div>
  );
}

/* ================= ROW (GRID BASED) ================= */

export function GridToolbarRow({ children, className }: GridToolbarRowProps) {
  return (
    <div
      className={cn(
        "grid items-center gap-2 px-2 pb-1.5 pt-0 w-full",
        // Standard 4-Column Symmetry: 3 equal fluid columns + 1 compact action column
        "grid-cols-1 md:grid-cols-[1fr_1fr_1fr_auto]",
        className
      )}
    >
      {children}
    </div>
  );
}

/* ================= SEARCH ================= */

export function GridToolbarSearch({
  value,
  onChange,
  onSearch,
  placeholder = "search here...",
  className,
}: GridToolbarSearchProps) {
  const handleBlur = () => {
    const normalizedValue = normalizeTextInput(value).trim();

    if (normalizedValue !== value) {
      onChange(normalizedValue);
    }
  };

  return (
    <div className={cn("flex items-center h-10 w-full", className)}>
      <div className="flex items-center gap-1 w-full">
        {/* INPUT */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4  h-4 text-muted-foreground" />
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onSearch?.();
              }
            }}
            placeholder={placeholder}
            className="pl-9 h-full text-sm rounded-lg border border-border bg-background shadow-sm w-full focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-border"
          />
        </div>

        {/* BUTTON */}
        <Button
          onClick={onSearch}
          className="h-full rounded-lg px-4 text-sm font-semibold whitespace-nowrap bg-background text-primary border border-primary/30 hover:bg-primary/5 transition-all shadow-sm"
          variant="outline"
        >
          Search
        </Button>
      </div>
    </div>
  );
}

/* ================= SELECT ================= */



export function GridToolbarSelect({
  label,
  value,
  onChange,
  options,
  className,
}: GridToolbarSelectProps) {
  const generatedId = useId();
  const normalizedLabel = label.trim().toLowerCase().replace(/\s+/g, "-");
  const selectId = `${normalizedLabel}-${generatedId}`;

  return (
    <div className={cn("flex items-center h-10 border border-border bg-background rounded-lg text-sm overflow-hidden shadow-sm w-full", className)}>
      {/* LABEL PREFIX */}
      <label
        htmlFor={selectId}
        className="px-3 bg-muted/40 text-muted-foreground text-[10px] font-bold uppercase tracking-wider whitespace-nowrap flex items-center border-r border-border h-full min-w-[70px] justify-center"
      >
        {label}
      </label>

      {/* NATIVE SELECT */}
      <NativeSelect
        id={selectId}
        name={selectId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 bg-transparent px-2 text-sm h-full truncate cursor-pointer focus:outline-none"
      >
        {options.map((option) => (
          <option
            key={`${label}-${option.value}`}
            value={option.value}
            disabled={option.disabled}
            className="bg-background"
          >
            {formatReadableLabel(option.label)}
          </option>
        ))}
      </NativeSelect>
    </div>
  );
}

/* ================= ACTIONS ================= */

export function GridToolbarActions({
  actions,
  className,
}: GridToolbarActionsProps) {
  return (
    <div className={cn("flex items-center h-10 gap-1 justify-end", className)}>
      {actions.map((action) => (
        <Tooltip key={action.key}>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className={cn(
                "h-10 w-10 rounded-lg hover:bg-muted/50 transition-colors bg-background shadow-sm",
                action.buttonClassName
              )}
              onClick={action.onClick}
              disabled={action.disabled}
            >
              {action.icon}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{action.label}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}

/* ================= DATE PICKER ================= */

import { ResponsiveDatePicker } from "@/components/ui/responsive-date-picker";
import { ResponsiveDateRangePicker } from "@/components/ui/responsive-date-range-picker";

type GridToolbarDatePickerProps = {
  label: string;
  value: Date | null;
  onChange: (date: Date | null) => void;
  className?: string;
  placeholder?: string;
  minDate?: Date;
  disabled?: boolean;
  displayFormat?: string;
};

export function GridToolbarDatePicker({
  label,
  value,
  onChange,
  className,
  placeholder = "dd-mm-yyyy",
  minDate,
  disabled,
  displayFormat
}: GridToolbarDatePickerProps) {
  return (
    <div className={cn("flex items-center h-10 border border-border bg-background rounded-lg text-sm overflow-hidden shadow-sm w-full", className)}>
       <span className="px-3 bg-muted/40 text-muted-foreground text-[10px] font-bold uppercase tracking-wider whitespace-nowrap flex items-center border-r border-border h-full min-w-[70px] justify-center">
        {label}
      </span>
      <ResponsiveDatePicker
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        label={label}
        minDate={minDate}
        disabled={disabled}
        displayFormat={displayFormat}
        className="h-10 border-0 rounded-none shadow-none focus-within:ring-0"
      />
    </div>
  );
}

/* ================= DATE RANGE PICKER ================= */

type GridToolbarRangePickerProps = {
  startDate: Date | null;
  endDate: Date | null;
  onChange: (dates: [Date | null, Date | null]) => void;
  className?: string;
  startLabel?: string;
  endLabel?: string;
  startPlaceholder?: string;
  endPlaceholder?: string;
  disabled?: boolean;
  displayFormat?: string;
  minDate?: Date;
};

export function GridToolbarRangePicker({
  startDate,
  endDate,
  onChange,
  className,
  startLabel = "From",
  endLabel = "To",
  startPlaceholder = "dd-mm-yyyy",
  endPlaceholder = "dd-mm-yyyy",
  disabled,
  displayFormat,
  minDate
}: GridToolbarRangePickerProps) {
  return (
     <ResponsiveDateRangePicker
        startDate={startDate}
        endDate={endDate}
        onChange={onChange}
        startPlaceholder={startPlaceholder}
        endPlaceholder={endPlaceholder}
        startLabel={startLabel}
        endLabel={endLabel}
        disabled={disabled}
        displayFormat={displayFormat}
        className={className}
        minDate={minDate}
     />
  );
}

/* ================= SPACER ================= */

type GridToolbarSpacerProps = {
  type?: "fluid" | "actions";
  className?: string;
};

export function GridToolbarSpacer({ type = "fluid", className }: GridToolbarSpacerProps) {
  return (
    <div 
      className={cn(
        type === "fluid" ? "w-full" : "w-[128px]", 
        className
      )} 
    />
  );
}
